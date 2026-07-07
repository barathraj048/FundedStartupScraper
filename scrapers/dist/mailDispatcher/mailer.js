import * as nodemailer from "nodemailer";
import * as path from "path";
export class MailOutReacher {
    transporter;
    constructor() {
        this.transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: "barathraj048@gmail.com",
                pass: "kbtd vbat ptla pmtf"
            }
        });
    }
    async sendPitch(targetMail, targetCompany, founder) {
        const subjectLine = `Scaling ${targetCompany} backend: HFT, OSS & Top 10% LeetCode`;
        // Upgraded plain-text formatting with hyphens for readability
        const textBody = `Hi ${founder || 'Team'},

         I know you're heads-down building ${targetCompany}, so I'll keep this brief. I'm a software engineer specialized in shipping production-ready code and optimizing complex architectures.

         A quick snapshot of my recent execution:
         - Ranked Top 10% globally on LeetCode (1754 rating), proving rigorous algorithmic efficiency.
         - Engineered a sub-100ms latency high-frequency trading system and developed a healthcare SaaS in 48 hours.
         - Active core infrastructure contributor to open-source projects like n8n and Cal.com.

         I am looking for a fast-paced engineering team where I can step in and make an immediate impact post-raise. I have attached my resume for a deeper dive into my stack.

         Are you open to a quick chat this week to see if there's a mutual fit?

         Best,

         Barath M
         Mail: barathraj048@gmail.com 
         GitHub: https://github.com/barathraj048/
         LeetCode: https://leetcode.com/u/barathraj048/
         Contact No: (+91) 9629244707`;
        try {
            await this.transporter.sendMail({
                from: "barathraj048@gmail.com",
                to: targetMail,
                subject: subjectLine,
                text: textBody,
                attachments: [
                    {
                        filename: 'Barath_Mohanraj_Resume.pdf',
                        path: path.resolve(process.cwd(), 'Barath_Mohanraj_Resume.pdf')
                    }
                ]
            });
            console.log(`Pitch delivered to ${targetMail} with attachment`);
            return true;
        }
        catch (e) {
            console.error(`Error while sending to ${targetMail}: ${e}`);
            return false;
        }
    }
}
const test = new MailOutReacher;
test.sendPitch("ammabharath05@gmail.com", "kittyGrow", "barath");
//# sourceMappingURL=mailer.js.map