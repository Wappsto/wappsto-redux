import { config, use } from '../src';

describe('config', () => {
  it('has baseUrl', () => {
    expect(config.baseUrl).toEqual('/services');
  });

  it('can be updated', () => {
    use({test: 'data', baseUrl: 'test'});
    expect(config.test).toEqual('data');
    expect(config.baseUrl).toEqual('test');
  });
});
