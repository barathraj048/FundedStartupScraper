import * as nodemailer from "nodemailer";
import * as path from "path";
import "dotenv/config";
export class MailOutReacher {
    transporter;
    constructor() {
        this.transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });
    }
    async sendPitch(targetMail, targetCompany, founder) {
        const subjectLine = `OSS contributor (n8n, Cal.com) · Top 9% LeetCode`;
        const textBody = `Hi ${founder || 'there'},

      Saw ${targetCompany}'s raise - congrats. Keeping this short.

      Three things instead of a cover letter:
      - Built and load-tested a trading engine at 1,000 req/s / 500 concurrent users, 21.9ms p95, 0% errors.
      - Merged code into n8n and Cal.com - tools that might already be in your stack.
      - Top 9% globally on LeetCode, 1,760+ peak rating, 325+ problems solved.

      If backend engineering is a priority right now, worth a quick call? If not, just say so and I'll drop it.

      Barath M
      github.com/barathraj048 · leetcode.com/u/barathraj048 · (+91) ${process.env.PHONE}`;
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
            console.log(process.env.EMAIL_PASS, process.env.EMAIL_USER);
            console.error(`Error while sending to ${targetMail}: ${e}`);
            return false;
        }
    }
}
let test = new MailOutReacher();
test.sendPitch("ammabharath05@gmail.com", "batman_Kitty_cave", "ambu");
//# sourceMappingURL=mailer.js.map