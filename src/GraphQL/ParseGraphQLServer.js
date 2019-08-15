import corsMiddleware from 'cors';
import bodyParser from 'body-parser';
import { graphqlUploadExpress } from 'graphql-upload';
import { graphqlExpress } from 'apollo-server-express/dist/expressApollo';
import { renderPlaygroundPage } from '@apollographql/graphql-playground-html';
import { execute, subscribe } from 'graphql';
import { SubscriptionServer } from 'subscriptions-transport-ws';
import { handleParseErrors, handleParseHeaders } from '../middlewares';
import requiredParameter from '../requiredParameter';
import defaultLogger from '../logger';
import { ParseGraphQLSchema } from './ParseGraphQLSchema';
import ParseGraphQLController, {
  ParseGraphQLConfig,
} from '../Controllers/ParseGraphQLController';

class ParseGraphQLServer {
  parseGraphQLController: ParseGraphQLController;

  constructor(parseServer, config) {
    this.parseServer =
      parseServer ||
      requiredParameter('You must provide a parseServer instance!');
    if (!config || !config.graphQLPath) {
      requiredParameter('You must provide a config.graphQLPath!');
    }
    this.config = config;
    this.parseGraphQLController = this.parseServer.config.parseGraphQLController;
    this.log =
      (this.parseServer.config && this.parseServer.config.loggerController) ||
      defaultLogger;
    this.parseGraphQLSchema = new ParseGraphQLSchema({
      parseGraphQLController: this.parseGraphQLController,
      databaseController: this.parseServer.config.databaseController,
      log: this.log,
      graphQLCustomTypeDefs: this.config.graphQLCustomTypeDefs,
    });
  }

  async _getGraphQLOptions(req) {
    try {
      return {
        schema: await this.parseGraphQLSchema.load(),
        context: {
          info: req.info,
          config: req.config,
          auth: req.auth,
        },
      };
    } catch (e) {
      this.log.error(e);
      throw e;
    }
  }

  applyGraphQL(app) {
    if (!app || !app.use) {
      requiredParameter('You must provide an Express.js app instance!');
    }

    const maxUploadSize = this.parseServer.config.maxUploadSize || '20mb';
    const maxFileSize =
      (Number(maxUploadSize.slice(0, -2)) * 1024) ^
      {
        kb: 1,
        mb: 2,
        gb: 3,
      }[maxUploadSize.slice(-2).toLowerCase()];

    app.use(this.config.graphQLPath, graphqlUploadExpress({ maxFileSize }));
    app.use(this.config.graphQLPath, corsMiddleware());
    app.use(this.config.graphQLPath, bodyParser.json());
    app.use(this.config.graphQLPath, handleParseHeaders);
    app.use(this.config.graphQLPath, handleParseErrors);
    app.use(
      this.config.graphQLPath,
      graphqlExpress(async req => await this._getGraphQLOptions(req))
    );
  }

  applyPlayground(app) {
    if (!app || !app.get) {
      requiredParameter('You must provide an Express.js app instance!');
    }
    app.get(
      this.config.playgroundPath ||
        requiredParameter(
          'You must provide a config.playgroundPath to applyPlayground!'
        ),
      (_req, res) => {
        res.setHeader('Content-Type', 'text/html');
        res.write(
          renderPlaygroundPage({
            endpoint: this.config.graphQLPath,
            subscriptionEndpoint: this.config.subscriptionsPath,
            headers: {
              'X-Parse-Application-Id': this.parseServer.config.appId,
              'X-Parse-Master-Key': this.parseServer.config.masterKey,
            },
          })
        );
        res.end();
      }
    );
  }

  createSubscriptions(server) {
    SubscriptionServer.create(
      {
        execute,
        subscribe,
        onOperation: async (_message, params, webSocket) =>
          Object.assign(
            {},
            params,
            await this._getGraphQLOptions(webSocket.upgradeReq)
          ),
      },
      {
        server,
        path:
          this.config.subscriptionsPath ||
          requiredParameter(
            'You must provide a config.subscriptionsPath to createSubscriptions!'
          ),
      }
    );
  }

  setGraphQLConfig(graphQLConfig: ParseGraphQLConfig): Promise {
    return this.parseGraphQLController.updateGraphQLConfig(graphQLConfig);
  }
}

export { ParseGraphQLServer };
