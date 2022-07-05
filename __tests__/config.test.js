import { config, use, getServiceVersion } from '../src';

describe('config', () => {
  it('has baseUrl', () => {
    expect(config.baseUrl).toEqual('/services');
  });

  it('can be updated', () => {
    use({ test: 'data', baseUrl: 'test' });
    expect(config.test).toEqual('data');
    expect(config.baseUrl).toEqual('test');
  });

  it('can return the corrent version', () => {
    use({
      baseUrl: '/services',
      serviceVersion: {
        default: '1.0',
        stream: '2.1',
      }
    });
    const defaultVersion = getServiceVersion('test');
    const streamVersion =  getServiceVersion('stream');

    expect(defaultVersion).toEqual('1.0');
    expect(streamVersion).toEqual('2.1');
  });
});
