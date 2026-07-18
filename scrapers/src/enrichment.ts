// src/enrichment.ts
import * as xlsx from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';
import { Impit } from 'impit';
import pLimit from 'p-limit';
import 'dotenv/config';

// Placeholder — swap in your target workbook filename here (e.g. "leeads_4.xlsx")
const EXCEL_FILE = "leeads.xlsx";
const CONCURRENCY = 5; // No LLM rate limit anymore — bounded only by politeness to target sites/APIs
const PAGE_TIMEOUT_MS = 6000;
const DOMAIN_PROBE_TIMEOUT_MS = 5000;

// Cheap, free domain guesses tried when a row has no website on file
const CANDIDATE_TLDS = ['com', 'in', 'io', 'co', 'ai'];
const CORPORATE_SUFFIXES = [/private limited/i, /pvt\.?\s*ltd\.?/i, /technologies/i, /technology/i, /solutions?/i, /labs?/i, /\binc\.?/i, /\bllc\.?/i, /\blimited\b/i, /\bltd\.?/i, /\bco\.?\b/i];

// Role inboxes aren't a "managing person" — drop them from the contact list
const ROLE_PREFIXES = new Set(['info', 'contact', 'hello', 'support', 'sales', 'admin', 'hr', 'careers', 'jobs', 'press', 'media', 'help', 'office', 'enquiry', 'enquiries', 'feedback', 'newsletter', 'marketing', 'billing', 'accounts', 'no-reply', 'noreply']);

// Emails that are clearly page boilerplate, not the company's own
const EMAIL_DOMAIN_BLACKLIST = new Set(['example.com', 'test.com', 'domain.com', 'email.com', 'yourdomain.com', 'sentry.io', 'wixpress.com', 'godaddy.com', 'schema.org', 'w3.org', 'gstatic.com', 'googleapis.com', 'fontawesome.com']);

interface ExecutiveContact {
   name: string;
   title: string;
   email: string;
   confidence: 'high' | 'predicted';
}

interface TavilySearchResult {
   title?: string;
   content?: string;
   raw_content?: string;
}

interface TavilySearchResponse {
   results?: TavilySearchResult[];
}

export class EnrichmentEngine {
   private filePath = path.resolve(process.cwd(), "output", EXCEL_FILE);
   private impit = new Impit({ browser: "chrome", ignoreTlsErrors: true, timeout: PAGE_TIMEOUT_MS });

   private async sleep(ms: number) {
      return new Promise(resolve => setTimeout(resolve, ms));
   }

   private getTargetData(): any[] {
      if (!fs.existsSync(this.filePath)) return [];
      const fileBuffer = fs.readFileSync(this.filePath);
      const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      if (!sheetName) return [];
      const worksheet = workbook.Sheets[sheetName];
      if (!worksheet) {
         console.log(`error in fetching the worksheet`);
         return [];
      }
      return xlsx.utils.sheet_to_json<any>(worksheet) || [];
   }

   private saveProgression(data: any[]) {
      try {
         const workSheet = xlsx.utils.json_to_sheet(data);
         const workbook = xlsx.utils.book_new();
         xlsx.utils.book_append_sheet(workbook, workSheet, "fundingRound");
         const outBuffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
         fs.writeFileSync(this.filePath, outBuffer);
      } catch (error: any) {
         if (error.code === 'EBUSY') {
            console.log(` ⚠️ [WARNING] Cannot save. Please close ${EXCEL_FILE} in Excel!`);
         } else {
            console.error(" ⚠️ [WARNING] Save error:", error);
         }
      }
   }

   private normalizeDomain(website: string): string {
      const withProtocol = /^https?:\/\//i.test(website) ? website : `https://${website}`;
      try {
         return new URL(withProtocol).hostname.replace(/^www\./i, '').toLowerCase();
      } catch {
         return website.replace(/^https?:\/\//i, '').replace(/^www\./i, '').split('/')[0]?.toLowerCase() ?? '';
      }
   }

   /**
    * Turns a startup name into a handful of plausible bare domains
    * ("Acme Technologies Pvt Ltd" -> acmetechnologiespvtltd.*, acme.*)
    */
   private slugifyCandidates(startupName: string): string[] {
      const lower = startupName.toLowerCase();
      const raw = lower.replace(/[^a-z0-9]/g, '');

      let cleaned = lower;
      for (const suffix of CORPORATE_SUFFIXES) cleaned = cleaned.replace(suffix, '');
      cleaned = cleaned.replace(/[^a-z0-9]/g, '');

      return [...new Set([cleaned, raw].filter(s => s.length >= 3))];
   }

   /**
    * Tier 0 — free domain discovery for rows with no website on file.
    * Probes a short list of likely domains instead of paying for search.
    */
   private async resolveDomain(startupName: string): Promise<string> {
      const candidates = this.slugifyCandidates(startupName)
         .flatMap(slug => CANDIDATE_TLDS.map(tld => `${slug}.${tld}`));

      for (const candidate of candidates) {
         try {
            const response = await this.impit.fetch(`https://${candidate}`, { method: 'GET', timeout: DOMAIN_PROBE_TIMEOUT_MS });
            if (response.ok) return this.normalizeDomain(response.url || candidate);
         } catch {
            // candidate didn't resolve/respond — try the next one
         }
      }
      return "";
   }

   /**
    * Tavily search fallback for rows the direct-crawl phase couldn't resolve.
    */
   private async performTavilySearch(startupName: string): Promise<string> {
      try {
         const response = await this.impit.fetch('https://api.tavily.com/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
               api_key: process.env.TAVILY_API_KEY,
               query: `${startupName} startup company team founder leadership`,
               search_depth: 'basic',
               include_raw_content: true,
               max_results: 3,
            }),
            timeout: PAGE_TIMEOUT_MS,
         });

         if (!response.ok) {
            console.log(` [${startupName}] Tavily Search returned status ${response.status}`);
            return "";
         }

         const data = await response.json() as TavilySearchResponse;
         const results = data.results ?? [];

         return results
            .map(r => [r.title, r.content, r.raw_content].filter((s): s is string => Boolean(s)).join('\n'))
            .join('\n\n');
      } catch (error) {
         console.log(` [${startupName}] Tavily search failed: ${(error as Error)?.message ?? error}`);
         return "";
      }
   }

   /**
    * Pure regex/heuristic pass over the crawled page text. No LLM, no paid API.
    */
   private parseLocalIntelligence(domain: string, pageText: string): ExecutiveContact[] {
      if (!pageText.trim()) return [];

      const contacts: ExecutiveContact[] = [];

      // 1. Emails literally printed on the company's own site are trustworthy as-is
      const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}/g;
      const rawEmails = pageText.match(emailRegex) || [];
      const distinctEmails = [...new Set(rawEmails.map(e => e.toLowerCase()))];

      for (const email of distinctEmails) {
         const [prefixRaw, emailDomain] = email.split('@');
         const prefix = prefixRaw ?? '';
         if (!prefix || !emailDomain) continue;
         if (EMAIL_DOMAIN_BLACKLIST.has(emailDomain)) continue;
         if (ROLE_PREFIXES.has(prefix.toLowerCase())) continue;

         const nameParts = prefix.split(/[._-]/).filter(Boolean);
         const name = nameParts.length >= 2
            ? nameParts.slice(0, 2).map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ')
            : prefix.charAt(0).toUpperCase() + prefix.slice(1);

         contacts.push({ name, title: "Executive / Management", email, confidence: 'high' });
      }

      // 2. Names found near founder/exec titles get a predicted @domain email
      const lines = pageText.split('\n');
      const titleRegex = /\b(founder|ceo|cto|cfo|co-founder|managing director)\b/i;

      for (const line of lines) {
         const match = line.match(titleRegex);
         if (!match) continue;
         const detectedTitle = match[0];
         // Multi-word/hyphenated titles ("co-founder", "managing director") span more than
         // one entry in `words`, so we match them as a token run rather than a single word.
         const titleTokens = detectedTitle.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);

         const cleanLine = line.replace(/[\[\]()\-|:*,]/g, ' ').replace(/\s+/g, ' ').trim();
         const words = cleanLine.split(' ');
         // Bio cards are short ("Jane Doe, Co-Founder & CEO"); long lines are prose, where
         // two capitalized words landing near "founder" by coincidence is a false positive.
         if (words.length > 12) continue;
         const lowerWords = words.map(w => w.toLowerCase());

         let keywordIndex = -1;
         for (let i = 0; i <= lowerWords.length - titleTokens.length; i++) {
            if (titleTokens.every((token, offset) => lowerWords[i + offset] === token)) {
               keywordIndex = i;
               break;
            }
         }
         if (keywordIndex === -1) continue;

         const titleSpan = titleTokens.length;
         let possibleName = "";
         if (keywordIndex > 1) {
            possibleName = `${words[keywordIndex - 2] ?? ''} ${words[keywordIndex - 1] ?? ''}`;
         } else if (keywordIndex + titleSpan < words.length - 1) {
            possibleName = `${words[keywordIndex + titleSpan] ?? ''} ${words[keywordIndex + titleSpan + 1] ?? ''}`;
         }

         if (!possibleName || !/^[A-Z][a-z]+\s[A-Z][a-z]+$/.test(possibleName)) continue;

         const cleanName = possibleName.trim();
         const [rawFirstName, rawLastName] = cleanName.split(' ');
         const firstName = (rawFirstName ?? '').toLowerCase();
         const lastName = (rawLastName ?? '').toLowerCase();
         const predictedEmail = `${firstName}.${lastName}@${domain}`;

         if (contacts.some(c => c.email === predictedEmail)) continue;

         contacts.push({ name: cleanName, title: detectedTitle.toUpperCase(), email: predictedEmail, confidence: 'predicted' });
      }

      return contacts;
   }

   private pickPrimaryContact(contacts: ExecutiveContact[]): ExecutiveContact | undefined {
      if (!contacts || contacts.length === 0) return undefined;
      const founderTitle = /founder|ceo|chief executive/i;
      return (
         contacts.find(c => founderTitle.test(c.title)) ??
         contacts.find(c => c.confidence === 'high') ??
         contacts[0]
      );
   }

   private async processRow(row: any): Promise<void> {
      console.log(`\n🔍 [${row.startupName}] Enriching via Tavily search fallback...`);
      try {
         let domain = row.website ? this.normalizeDomain(row.website) : "";

         if (!domain) {
            domain = await this.resolveDomain(row.startupName);
            if (!domain) {
               console.log(` [${row.startupName}] Could not resolve a domain — skipping.`);
               row.managementContacts = "[]";
               return;
            }
            console.log(` [${row.startupName}] Resolved domain: ${domain}`);
         }

         row.website = domain;

         const pageText = await this.performTavilySearch(row.startupName);
         if (!pageText.trim()) {
            console.log(` [${row.startupName}] No search results found — no contacts found.`);
            row.managementContacts = "[]";
            return;
         }

         const contacts = this.parseLocalIntelligence(domain, pageText);
         row.managementContacts = JSON.stringify(contacts);

         const primary = this.pickPrimaryContact(contacts);
         if (primary) {
            row.targetEmail = primary.email;
            row.founderName = primary.name;
            console.log(` [${row.startupName}] Lead acquired: ${primary.name} (${primary.title}) — ${primary.email} [${primary.confidence}]`);
         } else {
            console.log(` [${row.startupName}] No management contacts found on ${domain}.`);
         }
      } catch (error) {
         console.log(` [${row.startupName}] Crawl failed: ${(error as Error)?.message ?? error}`);
      } finally {
         // Brief, randomized courtesy pause so we don't hammer any single host
         await this.sleep(800 + Math.floor(Math.random() * 700));
      }
   }

   public async runEnrichment() {
      console.log(" Initiating Tavily Search-Fallback OSINT Enrichment Pipeline (Phase 2)...");

      const data = this.getTargetData();
      if (data.length === 0) {
         console.log(" No data found to enrich.");
         return;
      }

      // Retry every row still missing an email — including ones Phase 1 marked "[]"
      const targets = data.filter(row => !row.targetEmail);
      console.log(` Found ${targets.length} startups requiring active verification processing.`);

      const limit = pLimit(CONCURRENCY);

      await Promise.all(targets.map(row => limit(async () => {
         try {
            await this.processRow(row);
         } catch (error) {
            console.error(` Error enriching ${row.startupName}:`, error);
         } finally {
            this.saveProgression(data);
         }
      })));

      console.log("\n Enrichment complete. Excel database updated successfully.");
   }
}

const engine = new EnrichmentEngine();
engine.runEnrichment();
