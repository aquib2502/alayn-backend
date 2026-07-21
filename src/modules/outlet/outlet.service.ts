import { OutletRepository } from './outlet.repository';

export class OutletService {
  private repository = new OutletRepository();

  async create(businessId: string, userId: string, data: {
    name: string;
    address: string;
    city: string;
    state: string;
    country: string;
  }) {
    return this.repository.createOutlet(businessId, userId, data);
  }

  async listForBusiness(businessId: string) {
    return this.repository.getOutletsByBusiness(businessId);
  }

  async listForUser(userId: string) {
    return this.repository.getOutletsByUser(userId);
  }
}
