import type { ReachoutAdapter } from "../types/types.js";
export declare class MailOutReacher implements ReachoutAdapter {
    private transporter;
    constructor();
    sendPitch(targetMail: string, targetCompany: string, founder?: string): Promise<boolean>;
}
//# sourceMappingURL=mailer.d.ts.map