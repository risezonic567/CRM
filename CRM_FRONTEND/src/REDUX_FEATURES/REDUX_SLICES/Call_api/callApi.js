import { createApi } from '@reduxjs/toolkit/query/react';
import { axiosBaseQuery } from '../../../SERVICES/baseQuery';

export const callApi = createApi({
  reducerPath: 'callApi',
  baseQuery: axiosBaseQuery(),
  tagTypes: ['Calls'],
  endpoints: (builder) => ({
    listCalls: builder.query({
      query: (params) => ({
        url: '/calls',
        method: 'GET',
        params,
      }),
      providesTags: ['Calls'],
    }),
    getCall: builder.query({
      query: (id) => ({
        url: `/calls/${id}`,
        method: 'GET',
      }),
    }),
    createCall: builder.mutation({
      query: (body) => ({
        url: '/calls',
        method: 'POST',
        data: body,
      }),
      invalidatesTags: ['Calls'],
    }),
    addCallNote: builder.mutation({
      query: ({ id, text }) => ({
        url: `/calls/${id}/notes`,
        method: 'POST',
        data: { text },
      }),
      invalidatesTags: ['Calls'],
    }),
    recordCallPricing: builder.mutation({
      query: ({ id, body }) => ({
        url: `/calls/${id}/pricing`,
        method: 'POST',
        data: body,
      }),
      invalidatesTags: ['Calls'],
    }),
  }),
});

export const {
  useListCallsQuery,
  useGetCallQuery,
  useCreateCallMutation,
  useAddCallNoteMutation,
  useRecordCallPricingMutation,
} = callApi;
