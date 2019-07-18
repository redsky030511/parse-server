import { GraphQLObjectType, GraphQLNonNull, GraphQLString } from 'graphql';
import { FunctionsRouter } from '../../Routers/FunctionsRouter';
import * as defaultGraphQLTypes from './defaultGraphQLTypes';

const load = parseGraphQLSchema => {
  const fields = {};

  fields.call = {
    description:
      'The call mutation can be used to invoke a cloud code function.',
    args: {
      functionName: {
        description: 'This is the name of the function to be called.',
        type: new GraphQLNonNull(GraphQLString),
      },
      params: {
        description: 'These are the params to be passed to the function.',
        type: defaultGraphQLTypes.OBJECT,
      },
    },
    type: defaultGraphQLTypes.ANY,
    async resolve(_source, args, context) {
      try {
        const { functionName, params } = args;
        const { config, auth, info } = context;

        return (await FunctionsRouter.handleCloudFunction({
          params: {
            functionName,
          },
          config,
          auth,
          info,
          body: params,
        })).response.result;
      } catch (e) {
        parseGraphQLSchema.handleError(e);
      }
    },
  };

  const functionsMutation = new GraphQLObjectType({
    name: 'FunctionsMutation',
    description:
      'FunctionsMutation is the top level type for functions mutations.',
    fields,
  });
  parseGraphQLSchema.graphQLTypes.push(functionsMutation);

  parseGraphQLSchema.graphQLMutations.functions = {
    description: 'This is the top level for functions mutations.',
    type: functionsMutation,
    resolve: () => new Object(),
  };
};

export { load };
