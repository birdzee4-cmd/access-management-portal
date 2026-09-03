import type {
  DepartmentRepository,
  RoleRepository,
  SystemRepository,
} from "@access-portal/database";

export interface CatalogServiceDependencies {
  readonly departments: DepartmentRepository;
  readonly systems: SystemRepository;
  readonly roles: RoleRepository;
}

/** Query boundary for the normalized catalog in the new portal database. */
export class CatalogService {
  constructor(private readonly repositories: CatalogServiceDependencies) {}

  listActiveDepartments() {
    return this.repositories.departments.listActive();
  }

  listActiveSystems() {
    return this.repositories.systems.listActive();
  }

  listActiveRolesForSystem(systemId: string) {
    return this.repositories.roles.listActiveBySystem(systemId);
  }
}
