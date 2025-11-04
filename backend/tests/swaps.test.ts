import { jest } from '@jest/globals';

// Mock the models module (getClient & query)
const mockClient = () => {
  const client: any = {
    query: jest.fn(),
    release: jest.fn(),
  };
  return client;
};

// Create a reusable mock response object
const makeRes = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('swaps controller - respondToSwap', () => {
  let modelsMock: any;
  let controller: any;

  beforeEach(() => {
    jest.resetModules();
    modelsMock = {
      getClient: jest.fn(),
      query: jest.fn(),
    };
    // Provide the mock implementation for the module used by the controller
    jest.doMock('../src/models', () => modelsMock);

    // Import controller after mocking
    controller = require('../src/controllers/swaps');
  });

  test('respondToSwap - accepts a pending request and swaps owners', async () => {
    const client = mockClient();

    const requestRow = {
      id: 42,
      requester_id: 11,
      responder_id: 22,
      requester_slot_id: 101,
      responder_slot_id: 202,
      status: 'PENDING',
    };

    // Sequence-driven query mock: inspect SQL to return appropriate values
    client.query.mockImplementation(async (sql: string, params?: any[]) => {
      if (sql.startsWith('BEGIN')) return { rows: [] };
      if (sql.includes('FROM swap_requests') && sql.includes('FOR UPDATE')) {
        return { rows: [requestRow] };
      }
      // For updates and other queries return a generic success
      return { rows: [], rowCount: 1 };
    });

    modelsMock.getClient.mockResolvedValue(client);

    // Mock io to capture emits
    const io = { to: jest.fn().mockReturnThis(), emit: jest.fn() };

    const req: any = {
      params: { requestId: `${requestRow.id}` },
      body: { accept: true },
      app: { get: () => io },
      user: { id: requestRow.responder_id },
    };

    const res = makeRes();

    await controller.respondToSwap(req, res);

    // After accepting, response should indicate Accepted
    expect(res.json).toHaveBeenCalledWith({ message: 'Accepted' });

    // Ensure client queries included the select for update and several updates
    expect(client.query).toHaveBeenCalled();
    // Ensure events were updated (user_id swaps) and swap_request was marked ACCEPTED
  expect(client.query.mock.calls.some((call: any) => typeof call[0] === 'string' && call[0].includes('UPDATE events SET user_id'))).toBe(true);
  expect(client.query.mock.calls.some((call: any) => typeof call[0] === 'string' && call[0].includes("UPDATE swap_requests SET status = $1"))).toBe(true);

    // IO should emit update and events_changed to both users
    expect(io.to).toHaveBeenCalled();
    expect(io.emit).toHaveBeenCalled();

    // client released
    expect(client.release).toHaveBeenCalled();
  });

  test('respondToSwap - rejects a pending request and resets events to SWAPPABLE', async () => {
    const client = mockClient();
    const requestRow = {
      id: 55,
      requester_id: 7,
      responder_id: 8,
      requester_slot_id: 301,
      responder_slot_id: 302,
      status: 'PENDING',
    };

    client.query.mockImplementation(async (sql: string, params?: any[]) => {
      if (sql.startsWith('BEGIN')) return { rows: [] };
      if (sql.includes('FROM swap_requests') && sql.includes('FOR UPDATE')) {
        return { rows: [requestRow] };
      }
      return { rows: [], rowCount: 1 };
    });

    modelsMock.getClient.mockResolvedValue(client);

    const io = { to: jest.fn().mockReturnThis(), emit: jest.fn() };

    const req: any = {
      params: { requestId: `${requestRow.id}` },
      body: { accept: false },
      app: { get: () => io },
      user: { id: requestRow.responder_id },
    };

    const res = makeRes();

    await controller.respondToSwap(req, res);

    expect(res.json).toHaveBeenCalledWith({ message: 'Rejected' });
    // Ensure swap_requests updated to REJECTED
  expect(client.query.mock.calls.some((call: any) => typeof call[0] === 'string' && call[0].includes("UPDATE swap_requests SET status = $1"))).toBe(true);
  // Ensure events set back to SWAPPABLE
  expect(client.query.mock.calls.some((call: any) => typeof call[0] === 'string' && call[0].includes("UPDATE events SET status = $1")) ).toBe(true);
    expect(io.emit).toHaveBeenCalled();
    expect(client.release).toHaveBeenCalled();
  });

  test('respondToSwap - returns 404 when request not found or not PENDING', async () => {
    const client = mockClient();
    client.query.mockImplementation(async (sql: string, params?: any[]) => {
      if (sql.startsWith('BEGIN')) return { rows: [] };
      if (sql.includes('FROM swap_requests') && sql.includes('FOR UPDATE')) {
        return { rows: [] };
      }
      return { rows: [], rowCount: 0 };
    });
    modelsMock.getClient.mockResolvedValue(client);

    const req: any = {
      params: { requestId: `9999` },
      body: { accept: true },
      app: { get: () => null },
      user: { id: 500 },
    };

    const res = makeRes();

    await controller.respondToSwap(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Request not found' });
    expect(client.release).toHaveBeenCalled();
  });
});
