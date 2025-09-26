// ---- Users (owner/parents/kids) ----
type User = { id: string; name: string; role: "owner" | "parent" | "kid" | "caregiver" };

let USERS: User[] = [
  { id: "owner-pablo", name: "pablo", role: "owner" },
  { id: "kid-ryan", name: "Ryan", role: "kid" },
  { id: "kid-derek", name: "Derek", role: "kid" },
  { id: "kid-lovelyn", name: "Lovelyn", role: "kid" },
];

app.get("/api/users", (_req, res) => {
  res.json(USERS);
});
