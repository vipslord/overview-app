import Resolver from '@forge/resolver';
import { registerBitbucketResolvers } from './bitbucket.js';
import { registerAutomationResolvers } from './automation.js';

// resolver implementations are grouped in separate modules (Bitbucket + Jira automation)
const resolver = new Resolver();

registerBitbucketResolvers(resolver);
registerAutomationResolvers(resolver);

export const handler = resolver.getDefinitions();
