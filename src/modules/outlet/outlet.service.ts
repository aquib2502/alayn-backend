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

  async getHolidays(outletId: string) {
    return this.repository.getHolidays(outletId);
  }

  async createHoliday(outletId: string, name: string, dateStr: string, applyToAllOutlets?: boolean) {
    const date = new Date(dateStr);
    return this.repository.createHoliday(outletId, name, date, applyToAllOutlets);
  }

  async deleteHoliday(outletId: string, id: string) {
    return this.repository.deleteHoliday(outletId, id);
  }

  async updateOperatingDays(outletId: string, operatingDays: string[]) {
    return this.repository.updateOperatingDays(outletId, operatingDays);
  }
}
