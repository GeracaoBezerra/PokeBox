import { http } from "./http";

export async function getMe() {
  const body = await http.get("/auth/me");
  return body.data.user;
}

export async function adminCheck() {
  const body = await http.get("/auth/admin-check");
  return body.data;
}

export async function updateMe(data) {
  const body = await http.patch("/user/me", data);
  return body.data.user;
}

export async function deactivateMe() {
  await http.delete("/user/me");
}
