#!/usr/bin/env node
const {ApolloClient} = require('apollo-client');
const {InMemoryCache} = require('apollo-cache-inmemory');
const createHttpLink = require('createHttpLink');

const client = new ApolloClient({
  link: createHttpLink({ uri: 'http://api.githunt.com/graphql' }),
  cache: new InMemoryCache()
});

async function main() {
}


(async() => {
  console.log('starting...');

  await main().catch(e => {
    console.error("error in main\n", e);
    process.exit(1);
  });

  console.log('done...');
})();