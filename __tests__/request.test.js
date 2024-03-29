import fetchMock from 'jest-fetch-mock';
import {
  configureStore,
  makeRequestSelector,
  addSession,
  _request,
  makeRequest,
  removeRequest,
  overrideRequest,
  cancelAllRequests,
} from '../src';

describe('request', () => {
  fetchMock.enableMocks();
  const getRequest = makeRequestSelector();
  let store;

  beforeEach(() => {
    fetch.resetMocks();
    store = configureStore();
  });

  it('can make a request', async () => {
    const req = await store.dispatch(
      makeRequest({
        dispatchEntities: false,
        method: 'PATCH',
        url: '/test',
        body: {
          test: 'test',
        },
      }),
    );
    expect(req.ok).toBe(true);
    expect(req.status).toBe(200);
    expect(req.options.method).toEqual('PATCH');
    expect(req.options.body).toEqual('{"test":"test"}');
    expect(req.options.url).toEqual('/services/test');
    expect(req.options.headers.Accept).toEqual('application/json');
    expect(req.options.headers['Content-Type']).toEqual('application/json');
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('can make a request with full URL', async () => {
    const res = { file_id: 'dc1695e7-346d-4e64-9dcf-29c562362042', status: 'ok' };
    fetch.mockResponseOnce(JSON.stringify(res), { status: 201 });

    const requestId = 1;
    const req = await store.dispatch(
      makeRequest({
        method: 'GET',
        url: 'https://showme.wappsto.com',
        id: requestId,
      }),
    );

    await new Promise((r) => {
      setTimeout(r, 1);
    });

    const request = getRequest(store.getState(), requestId);

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(req.status).toBe(201);

    expect(request.url).toEqual('https://showme.wappsto.com');
    expect(request.method).toEqual('GET');
    expect(request.status).toBe('success');
    expect(request.json).toEqual(res);
  });

  it('can make a request with full URL and query', async () => {
    const res = { file_id: 'dc1695e7-346d-4e64-9dcf-29c562362042', status: 'ok' };
    fetch.mockResponseOnce(JSON.stringify(res), { status: 201 });

    let url = 'https://showme.wappsto.com/generate_report';
    url += '?type=monthly&x_session=cce01ae3-3150-4811-9f47-3fec80d7aed0';

    const requestId = 1;
    const req = await store.dispatch(
      makeRequest({
        method: 'GET',
        url,
        id: requestId,
      }),
    );

    await new Promise((r) => {
      setTimeout(r, 1);
    });

    const request = getRequest(store.getState(), requestId);

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(req.status).toBe(201);

    expect(request.url).toEqual('https://showme.wappsto.com/generate_report');
    expect(request.method).toEqual('GET');
    expect(request.status).toBe('success');
    expect(request.json).toEqual(res);
  });

  it('can make a request with query', async () => {
    const req = await store.dispatch(
      makeRequest({
        method: 'GET',
        url: '/test?q1=q2',
        body: {
          test: 'test',
        },
      }),
    );
    expect(req.options.url).toEqual('/services/test?q1=q2');
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('can make a request with query in option', async () => {
    const req = await store.dispatch(
      makeRequest({
        method: 'GET',
        query: { q1: 'q2' },
        url: '/test?q3=q4',
        body: {
          test: 'test',
        },
      }),
    );
    expect(req.options.url).toEqual('/services/test?q3=q4&q1=q2');
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('can make a request with query array', async () => {
    const req = await store.dispatch(
      makeRequest({
        method: 'PUT',
        url: '/test?q1=q2&q1=q3',
        body: {
          test: 'test',
        },
      }),
    );
    expect(req.options.url).toEqual('/services/test?q1=q2&q1=q3');
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('can make a request with session', async () => {
    await store.dispatch(
      addSession({
        meta: {
          id: 'bc09f773-001a-4c36-a7d9-bb6dfbfafc02',
        },
      }),
    );
    const req = await store.dispatch(
      makeRequest({
        method: 'PUT',
        url: '/test?q1=q2&q1=q3',
        body: {
          test: 'test',
        },
      }),
    );
    expect(req.options.url).toEqual('/services/test?q1=q2&q1=q3');
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('can make a DELETE request', async () => {
    fetch.mockResponseOnce('{"deleted": ["93c47415-0e68-4d5f-9c58-c1fe32322037"]}');
    const req = await store.dispatch(
      makeRequest({
        method: 'DELETE',
        url: '/test',
        body: {
          test: 'test',
        },
      }),
    );
    expect(req.json).toEqual({ deleted: ['93c47415-0e68-4d5f-9c58-c1fe32322037'] });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('can make a File request', async () => {
    fetch.mockResponseOnce('File data');
    const req = await store.dispatch(
      makeRequest({
        method: 'GET',
        url: '/file/93c47415-0e68-4d5f-9c58-c1fe32322037/document',
        body: {
          test: 'test',
        },
      }),
    );

    expect(req.text).toEqual('File data');
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('will not fire the same request multiple times', async () => {
    fetch.mockResponseOnce('File data');
    const req1 = store.dispatch(
      makeRequest({
        method: 'GET',
        url: '/test',
      }),
    );
    const req2 = store.dispatch(
      makeRequest({
        method: 'GET',
        url: '/test',
      }),
    );

    expect(req1).toBe(req2);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('can get a request', async () => {
    const id = 'id1';
    await store.dispatch(
      makeRequest({
        url: '/test',
        id,
      }),
    );
    const req = getRequest(store.getState(), id);

    expect(req.id).toEqual(id);
    expect(req.method).toEqual('GET');
    expect(req.url).toEqual('/test');
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('can remove a request', async () => {
    const id = 'id1';
    await store.dispatch(
      makeRequest({
        url: '/test',
        id,
      }),
    );
    const req1 = getRequest(store.getState(), id);
    await store.dispatch(removeRequest(id));

    const req2 = getRequest(store.getState(), id);
    expect(req1).not.toBe(undefined);
    expect(req2).toBe(undefined);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('can handle an error', async () => {
    fetch.mockRejectOnce(() => Promise.reject({}));
    const id = 'id1';
    await store.dispatch(
      makeRequest({
        url: '/test',
        id,
      }),
    );

    const req = getRequest(store.getState(), id);
    expect(req.id).toEqual(id);
    expect(req.status).toEqual('error');
    expect(req.json).toEqual(undefined);
    expect(req.body).toEqual(undefined);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('can handle an invalid session error', async () => {
    await store.dispatch(
      addSession({
        meta: {
          id: 'bc09f773-001a-4c36-a7d9-bb6dfbfafc02',
        },
      }),
    );
    fetch.mockResponseOnce('{"code": 117000000}', { status: 400 });
    const id = 'id1';
    await store.dispatch(
      makeRequest({
        url: '/test',
        id,
      }),
    );

    const req = getRequest(store.getState(), id);

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(req.id).toEqual(id);
    expect(req.status).toEqual('error');
    expect(req.json).toEqual({ code: 117000000 });
    expect(req.body).toEqual(undefined);
  });

  it('can handle an limit reached error', async () => {
    fetch.mockResponseOnce('{"code": 300098}', { status: 400 });
    const id = 'id1';
    await store.dispatch(
      makeRequest({
        url: '/test',
        id,
      }),
    );

    const req = getRequest(store.getState(), id);

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(req.id).toEqual(id);
    expect(req.status).toEqual('error');
    expect(req.json).toEqual({ code: 300098 });
    expect(req.body).toEqual(undefined);
  });

  it('can clear all requests', async () => {
    fetch
      .mockResponseOnce(
        () =>
          new Promise((r) => {
            setTimeout(r, 1);
          }),
      )
      .mockResponseOnce(
        () =>
          new Promise((r) => {
            setTimeout(r, 1);
          }),
      );
    store.dispatch(
      makeRequest({
        id: '1',
        method: 'POST',
        url: '/test',
        body: {},
      }),
    );
    store.dispatch(
      makeRequest({
        id: '2',
        method: 'PUT',
        url: '/test2',
        body: {},
      }),
    );

    let req1 = getRequest(store.getState(), '1');
    let req2 = getRequest(store.getState(), '2');
    expect(req1.status).toEqual('pending');
    expect(req2.status).toEqual('pending');

    cancelAllRequests();

    await new Promise((r) => {
      setTimeout(r, 1);
    });

    req1 = getRequest(store.getState(), '1');
    req2 = getRequest(store.getState(), '2');

    expect(req1.status).toEqual('error');
    expect(req2.status).toEqual('error');
  });

  it('can override the request method', async () => {
    const fun = jest.fn(
      () =>
        new Promise((resolve) => {
          resolve();
        }),
    );
    overrideRequest(fun);

    await store.dispatch(
      makeRequest({
        url: '/test',
      }),
    );
    overrideRequest(_request);

    expect(fun).toHaveBeenCalledTimes(1);
  });
});
