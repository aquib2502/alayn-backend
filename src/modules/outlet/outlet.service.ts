import { OutletRepository } from './outlet.repository';

export class OutletService {
  private repository = new OutletRepository();

  async create(tenantId: string, userId: string, data: {
    name: string;
    address: string;
    city: string;
    state: string;
    country: string;
  }) {
    return this.repository.createOutlet(tenantId, userId, data);
  }

  async listForTenant(tenantId: string) {
    return this.repository.getOutletsByTenant(tenantId);
  }

  async listForUser(userId: string) {
    return this.repository.getOutletsByUser(userId);
  }
}
