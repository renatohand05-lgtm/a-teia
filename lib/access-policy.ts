export function canAccessCompany(actorOwnerId: string, companyOwnerId: string): boolean {
  return actorOwnerId === companyOwnerId;
}
