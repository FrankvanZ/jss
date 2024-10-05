/* eslint-disable no-unused-expressions */
import { expect } from 'chai';
import sinon, { SinonSpy } from 'sinon';
import nock from 'nock';
import { SitecoreTemplateId } from '../constants';
import { GraphQLClient, GraphQLRequestClient } from '../graphql-request-client';
import { queryError, GraphQLContentTokenServiceConfig } from './graphql-content-token-service';
import { GraphQLContentTokenService } from '.';
import contentTokenQueryResponse from '../test-data/mockContentTokenQueryResponse.json';
import appRootQueryResponse from '../test-data/mockAppRootQueryResponse.json';

class TestService extends GraphQLContentTokenService {
  public client: GraphQLClient;
  constructor(options: GraphQLContentTokenServiceConfig) {
    super(options);
    this.client = this.getGraphQLClient();
  }
}

describe('GraphQLContentTokenService', () => {
  const endpoint = 'http://site';
  const siteName = 'site-name';
  const apiKey = 'api-key';
  const rootItemId = '{GUID}';
  const clientFactory = GraphQLRequestClient.createClientFactory({
    endpoint,
    apiKey,
  });

  afterEach(() => {
    nock.cleanAll();
  });

  it('should fetch dictionary phrases using clientFactory', async () => {
    nock(endpoint, { reqheaders: { sc_apikey: apiKey } })
      .post('/', /ContentTokenSearch/gi)
      .reply(200, contentTokenQueryResponse);

    const service = new GraphQLContentTokenService({
      siteName,
      rootItemId,
      cacheEnabled: false,
      clientFactory,
    });
    const result = await service.fetchContentTokens('en');
    expect(result.foo).to.equal('foo');
    expect(result.bar).to.equal('bar');
  });

  it('should attempt to fetch the rootItemId, if rootItemId not provided', async () => {
    nock(endpoint)
      .post('/', /AppRootQuery/)
      .reply(200, appRootQueryResponse);

    nock(endpoint)
      .post('/', (body) => body.variables.rootItemId === 'GUIDGUIDGUID')
      .reply(200, contentTokenQueryResponse);

    const service = new GraphQLContentTokenService({
      clientFactory,
      siteName,
      cacheEnabled: false,
    });
    const result = await service.fetchContentTokens('en');
    expect(result).to.have.all.keys('foo', 'bar');
    // eslint-disable-next-line no-unused-expressions
    expect(nock.isDone()).to.be.true;
  });

  it('should use a custom rootItemId, if provided', async () => {
    const customRootId = 'cats';

    nock(endpoint)
      .post('/', (body) => body.variables.rootItemId === customRootId)
      .reply(200, contentTokenQueryResponse);

    const service = new GraphQLContentTokenService({
      clientFactory,
      siteName,
      cacheEnabled: false,
      rootItemId: customRootId,
    });
    const result = await service.fetchContentTokens('en');
    expect(result).to.have.all.keys('foo', 'bar');
  });

  it('should use a jssTemplateId, if provided', async () => {
    const jssAppTemplateId = '{71d608ca-ac9c-4f1c-8e0a-85a6946e30f8}';
    const randomId = '{412286b7-6d4f-4deb-80e9-108ee986c6e9}';

    nock(endpoint)
      .post('/', (body) => body.variables.jssAppTemplateId === jssAppTemplateId)
      .reply(200, {
        data: {
          layout: {
            homePage: {
              rootItem: [
                {
                  id: randomId,
                },
              ],
            },
          },
        },
      });

    nock(endpoint)
      .post('/', (body) => body.variables.rootItemId === randomId)
      .reply(200, contentTokenQueryResponse);

    const service = new GraphQLContentTokenService({
      clientFactory,
      siteName,
      cacheEnabled: false,
      jssAppTemplateId,
    });

    const result = await service.fetchContentTokens('en');
    expect(result).to.have.all.keys('foo', 'bar');
  });

  it('should throw error if could not resolve rootItemId', async () => {
    nock(endpoint)
      .post('/', /AppRootQuery/)
      .reply(200, {
        data: {
          layout: {
            homePage: null,
          },
        },
      });

    const service = new GraphQLContentTokenService({
      clientFactory,
      siteName,
      cacheEnabled: false,
    });

    await service.fetchContentTokens('en').catch((error) => {
      expect(error).to.be.instanceOf(Error);
      expect(error.message).to.equal(queryError);
    });
  });

  it('should use default pageSize, if pageSize not provided', async () => {
    nock(endpoint)
      .post(
        '/',
        (body) =>
          body.query.indexOf('$pageSize: Int = 10') > 0 && body.variables.pageSize === undefined
      )
      .reply(200, contentTokenQueryResponse);

    const service = new GraphQLContentTokenService({
      clientFactory,
      siteName,
      rootItemId,
      cacheEnabled: false,
      pageSize: undefined,
    });
    const result = await service.fetchContentTokens('en');
    expect(result).to.have.all.keys('foo', 'bar');
  });

  it('should use a custom pageSize, if provided', async () => {
    const customPageSize = 2;

    nock(endpoint)
      .post('/', (body) => body.variables.pageSize === customPageSize)
      .reply(200, contentTokenQueryResponse);

    const service = new GraphQLContentTokenService({
      clientFactory,
      siteName,
      rootItemId,
      cacheEnabled: false,
      pageSize: customPageSize,
    });
    const result = await service.fetchContentTokens('en');
    expect(result).to.have.all.keys('foo', 'bar');
  });

  it('should use custom dictionary entry template ID, if provided', async () => {
    const customTemplateId = 'custom-template-id';

    nock(endpoint)
      .post('/', (body) => body.variables.templates === customTemplateId)
      .reply(200, contentTokenQueryResponse);

    const service = new GraphQLContentTokenService({
      clientFactory,
      siteName,
      rootItemId,
      cacheEnabled: false,
      dictionaryEntryTemplateId: customTemplateId,
    });
    const result = await service.fetchContentTokens('en');
    expect(result).to.have.all.keys('foo', 'bar');
  });

  it('should use default dictionary entry template ID, if template ID not provided', async () => {
    nock(endpoint)
      .post('/', (body) => body.variables.templates === SitecoreTemplateId.DictionaryEntry)
      .reply(200, contentTokenQueryResponse);

    const service = new GraphQLContentTokenService({
      clientFactory,
      siteName,
      rootItemId,
      cacheEnabled: false,
    });
    const result = await service.fetchContentTokens('en');
    expect(result).to.have.all.keys('foo', 'bar');
  });

  it('should use cache', async () => {
    nock(endpoint, { reqheaders: { sc_apikey: apiKey } })
      .post('/', /ContentTokenSearch/gi)
      .reply(200, contentTokenQueryResponse);

    const service = new GraphQLContentTokenService({
      clientFactory,
      siteName,
      rootItemId,
      cacheEnabled: true,
      cacheTimeout: 2,
    });

    const result1 = await service.fetchContentTokens('en');
    expect(result1).to.have.all.keys('foo', 'bar');

    const result2 = await service.fetchContentTokens('en');
    expect(result2).to.have.all.keys('foo', 'bar');
  });

  it('should provide a default GraphQL client', () => {
    const service = new TestService({
      clientFactory,
      siteName,
      rootItemId,
      cacheEnabled: false,
    });

    const graphQLClient = service.client as GraphQLClient;
    const graphQLRequestClient = service.client as GraphQLRequestClient;
    // eslint-disable-next-line no-unused-expressions
    expect(graphQLClient).to.exist;
    // eslint-disable-next-line no-unused-expressions
    expect(graphQLRequestClient).to.exist;
  });

  it('should call clientFactory with the correct arguments', () => {
    const clientFactorySpy: SinonSpy = sinon.spy();
    const mockServiceConfig = {
      siteName: 'supersite',
      clientFactory: clientFactorySpy,
      retries: 3,
      retryStrategy: {
        getDelay: () => 1000,
        shouldRetry: () => true,
      },
    };

    new GraphQLContentTokenService(mockServiceConfig);

    expect(clientFactorySpy.calledOnce).to.be.true;

    const calledWithArgs = clientFactorySpy.firstCall.args[0];
    expect(calledWithArgs.debugger).to.exist;
    expect(calledWithArgs.retries).to.equal(mockServiceConfig.retries);
    expect(calledWithArgs.retryStrategy).to.deep.equal(mockServiceConfig.retryStrategy);
  });
});
