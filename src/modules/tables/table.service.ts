import { randomUUID } from 'crypto';
import { TableRepository } from './table.repository';
import { AppError } from '../../utils/AppError';

export class TableService {
  private repository = new TableRepository();

  // Tokens valid for 10 years (long-lived QR codes for physical table stickers)
  private getFarFutureExpiry(): Date {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 10);
    return d;
  }

  async getTables(outletId: string) {
    const tables = await this.repository.findTablesByOutlet(outletId);
    return tables.map((t: {
      id: string;
      tableNumber: number;
      tableType: string;
      status: string;
      createdAt: Date;
      tokens: Array<{ token: string; expiresAt: Date }>;
    }) => ({
      id: t.id,
      tableNumber: t.tableNumber,
      tableType: t.tableType,
      status: t.status,
      currentToken: t.tokens[0]?.token || null,
      tokenExpiresAt: t.tokens[0]?.expiresAt || null,
      createdAt: t.createdAt,
    }));
  }

  async createBulkTables(outletId: string, acCount: number, nonAcCount: number) {
    let currentMaxNumber = await this.repository.getMaxTableNumber(outletId);
    const createdTables = [];
    const expiresAt = this.getFarFutureExpiry();

    // Create AC Tables
    for (let i = 0; i < acCount; i++) {
      currentMaxNumber += 1;
      const token = randomUUID();
      const table = await this.repository.createTableWithToken(
        outletId,
        currentMaxNumber,
        'AC',
        token,
        expiresAt
      );
      createdTables.push(table);
    }

    // Create Non-AC Tables
    for (let i = 0; i < nonAcCount; i++) {
      currentMaxNumber += 1;
      const token = randomUUID();
      const table = await this.repository.createTableWithToken(
        outletId,
        currentMaxNumber,
        'NON_AC',
        token,
        expiresAt
      );
      createdTables.push(table);
    }

    return createdTables;
  }

  async updateTable(
    outletId: string,
    tableId: string,
    data: { tableType?: 'AC' | 'NON_AC'; status?: 'AVAILABLE' | 'OCCUPIED' }
  ) {
    const existing = await this.repository.findTableById(outletId, tableId);
    if (!existing) {
      throw new AppError('TABLE_NOT_FOUND', 'Table not found', 404);
    }
    return this.repository.updateTable(outletId, tableId, data);
  }

  async regenerateQRToken(outletId: string, tableId: string) {
    const existing = await this.repository.findTableById(outletId, tableId);
    if (!existing) {
      throw new AppError('TABLE_NOT_FOUND', 'Table not found', 404);
    }
    const token = randomUUID();
    const expiresAt = this.getFarFutureExpiry();
    const tableToken = await this.repository.generateNewToken(
      outletId,
      tableId,
      existing.tableNumber,
      token,
      expiresAt
    );
    return {
      tableId: existing.id,
      tableNumber: existing.tableNumber,
      token: tableToken.token,
      expiresAt: tableToken.expiresAt,
    };
  }

  async deleteTable(outletId: string, tableId: string) {
    const existing = await this.repository.findTableById(outletId, tableId);
    if (!existing) {
      throw new AppError('TABLE_NOT_FOUND', 'Table not found', 404);
    }
    return this.repository.deleteTable(outletId, tableId);
  }
}
