import { ApolloClient, InMemoryCache, createHttpLink } from '@apollo/client'

const backendUrl = import.meta.env.VITE_API_URL || '';
const httpLink = createHttpLink({
  uri: backendUrl ? `${backendUrl}/graphql/` : '/graphql/',
  credentials: 'include',
})

const client = new ApolloClient({
  link: httpLink,
  cache: new InMemoryCache(),
})

export default client
