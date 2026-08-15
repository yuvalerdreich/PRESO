import { describe, expect, it } from 'vitest';

import { discoveryRepository } from '@/lib/discovery/repository';

describe('mock discovery repository', () => {
  it('filters local businesses by query, category, and area', async () => {
    await expect(discoveryRepository.searchBusinesses({ q: 'Glow' })).resolves.toMatchObject([
      { id: 'b18f6ca9-0c44-45b8-a8d9-3e1a2c6a1002' },
    ]);
    await expect(discoveryRepository.searchBusinesses({ category: 'fitness' })).resolves.toHaveLength(1);
    await expect(discoveryRepository.searchBusinesses({ area: 'תל אביב' })).resolves.toHaveLength(1);
  });

  it('returns no result for unmatched filters', async () => {
    await expect(discoveryRepository.searchBusinesses({ q: 'unmatched business' })).resolves.toEqual([]);
  });

  it('returns business details, its employees, and only services owned by the selected employee', async () => {
    const businessId = 'b18f6ca9-0c44-45b8-a8d9-3e1a2c6a1001';
    const employeeId = 'e-zohar';

    await expect(discoveryRepository.getBusinessProfile(businessId)).resolves.toMatchObject({ id: businessId });
    await expect(discoveryRepository.listBusinessEmployees(businessId)).resolves.toHaveLength(2);
    await expect(discoveryRepository.getBusinessEmployee(businessId, employeeId)).resolves.toMatchObject({
      id: employeeId,
      businessId,
    });
    const employeeServices = await discoveryRepository.listEmployeeServices(businessId, employeeId);
    expect(employeeServices).not.toHaveLength(0);
    expect(employeeServices.every((service) => service.employeeId === employeeId)).toBe(true);
  });

  it('does not expose an employee or services through another business route', async () => {
    await expect(
      discoveryRepository.getBusinessEmployee('b18f6ca9-0c44-45b8-a8d9-3e1a2c6a1002', 'e-zohar'),
    ).resolves.toBeNull();
    await expect(
      discoveryRepository.listEmployeeServices('b18f6ca9-0c44-45b8-a8d9-3e1a2c6a1002', 'e-zohar'),
    ).resolves.toEqual([]);
  });
});
