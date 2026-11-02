/** Declared in its own module and only imported by the routers that return it. */
export interface Member {
  id: string;
  role: "owner" | "member";
  joinedAt: Date;
}
