import { db } from "../../infrastructure/database/db";

export class CreateAuditLog {
  async execute(
    userName: string,
    action: string,
    tableName: string,
    recordId: string,
    oldValue: any = null,
    newValue: any = null,
    ipAddress: string = ""
  ): Promise<void> {

    await db("audit_logs").insert({
      occurred_at: new Date(),
      user_name: userName,
      action,
      table_name: tableName,
      record_id: recordId,
      old_value: oldValue,
      new_value: newValue,
      ip_address: ipAddress
    });

  }
}