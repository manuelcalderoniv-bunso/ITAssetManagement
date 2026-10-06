import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { db } from "../../infrastructure/database/db";

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  fullName: string;
  email: string;
  password: string;
  departmentId?: number | null;
}

export class AuthService {
  async login({ email, password }: LoginRequest) {
    const user = await db("users").where({ email }).first();

    // Same message for unknown user and wrong password — do not leak which.
    if (!user) {
      throw new Error("Invalid email or password");
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      throw new Error("Invalid email or password");
    }

    if (!user.is_active) {
      throw new Error("Account is pending approval");
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error("Server configuration error");

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      secret,
      { expiresIn: (process.env.JWT_EXPIRES_IN ?? "8h") as jwt.SignOptions["expiresIn"] }
    );

    await db("audit_logs").insert({
      user_name: user.email,
      action: "Login",
      table_name: "users",
      record_id: user.email,
      new_value: JSON.stringify({ role: user.role }),
      ip_address: null,
    });

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
      },
    };
  }

  async register({ fullName, email, password, departmentId }: RegisterRequest) {
    const existing = await db("users").where({ email }).first();
    if (existing) {
      throw new Error("Email is already registered");
    }

    if (password.length < 8) {
      throw new Error("Password must be at least 8 characters");
    }

    const hash = await bcrypt.hash(password, 10);

    const [row] = await db("users")
      .insert({
        full_name: fullName,
        email,
        password: hash,
        role: "IT_STAFF",
        department_id: departmentId ?? null,
        is_active: false,
      })
      .returning(["id", "email", "full_name", "role", "is_active"]);

    await db("audit_logs").insert({
      user_name: email,
      action: "Create",
      table_name: "users",
      record_id: email,
      new_value: JSON.stringify({ full_name: fullName, role: "IT_STAFF" }),
      ip_address: null,
    });

    return row;
  }

  async me(userId: number) {
    const user = await db("users")
      .select("id", "email", "full_name", "role", "is_active")
      .where({ id: userId })
      .first();
    if (!user) throw new Error("User not found");
    return user;
  }

  async listPending() {
    return db("users")
      .select("id", "email", "full_name", "role", "created_at", "is_active")
      .orderBy("created_at", "desc");
  }

  async approve(userId: number, actorEmail: string) {
    const user = await db("users").where({ id: userId }).first();
    if (!user) throw new Error("User not found");

    await db("users").where({ id: userId }).update({ is_active: true });

    await db("audit_logs").insert({
      user_name: actorEmail,
      action: "Edit",
      table_name: "users",
      record_id: user.email,
      old_value: JSON.stringify({ is_active: false }),
      new_value: JSON.stringify({ is_active: true }),
      ip_address: null,
    });

    return { id: userId, is_active: true };
  }
}
