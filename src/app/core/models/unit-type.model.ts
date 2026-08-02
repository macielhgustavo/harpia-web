export interface UnitType {
  id: string;
  organizationId: string;
  developmentId: string;
  name: string;
  bedrooms: number | null;
  suites: number | null;
  standardArea: number | null;
  createdAt: string;
  updatedAt: string;
}
