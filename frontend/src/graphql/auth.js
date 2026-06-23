import { gql } from '@apollo/client'

export const LOGIN = gql`
  mutation Login($username: String!, $password: String!) {
    login(username: $username, password: $password) {
      success
      mensaje
      usuario {
        id
        username
        rolNombre
        isSuperuser
        permisos
      }
    }
  }
`

export const LOGOUT = gql`
  mutation Logout {
    logout
  }
`

export const ME = gql`
  query Me {
    me {
      id
      username
      rolNombre
      isSuperuser
      permisos
      avatarUrl
    }
  }
`
