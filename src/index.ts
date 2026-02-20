import Resolver from '@forge/resolver';
import { registerAutomationResolvers } from './automation';
import { registerBitbucketResolvers } from './bitbucket';

const resolver = new Resolver();

// Register PR resolvers
registerBitbucketResolvers(resolver);
registerAutomationResolvers(resolver);

export const handler = resolver.getDefinitions();