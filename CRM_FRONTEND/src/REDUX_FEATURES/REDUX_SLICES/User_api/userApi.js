import { createApi } from '@reduxjs/toolkit/query/react';
import { axiosBaseQuery } from '../../../SERVICES/baseQuery';

export const userApi = createApi({
  reducerPath: 'userApi',
  baseQuery: axiosBaseQuery(),
  tagTypes: ['Users', 'Company'],
  endpoints: (builder) => ({
    listUsers: builder.query({
      query: (params) => ({
        url: '/users',
        method: 'GET',
        params,
      }),
      providesTags: ['Users'],
    }),
    createUser: builder.mutation({
      query: (body) => ({
        url: '/users',
        method: 'POST',
        data: body,
      }),
      invalidatesTags: ['Users'],
    }),
    updateUser: builder.mutation({
      query: ({ id, body }) => ({
        url: `/users/${id}`,
        method: 'PATCH',
        data: body,
      }),
      invalidatesTags: ['Users'],
    }),
    getCompany: builder.query({
      query: () => ({
        url: '/users/company',
        method: 'GET',
      }),
      providesTags: ['Company'],
    }),
    updateCompany: builder.mutation({
      query: (body) => ({
        url: '/users/company',
        method: 'PATCH',
        data: body,
      }),
      invalidatesTags: ['Company'],
    }),
  }),
});

export const {
  useListUsersQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useGetCompanyQuery,
  useUpdateCompanyMutation,
} = userApi;
