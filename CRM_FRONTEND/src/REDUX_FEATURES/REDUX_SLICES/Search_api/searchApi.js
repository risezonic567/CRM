import { createApi } from '@reduxjs/toolkit/query/react';
import { axiosBaseQuery } from '../../../SERVICES/baseQuery';

export const searchApi = createApi({
  reducerPath: 'searchApi',
  baseQuery: axiosBaseQuery(),
  endpoints: (builder) => ({
    searchFlights: builder.mutation({
      query: (body) => ({
        url: '/search/flights',
        method: 'POST',
        data: body,
      }),
    }),
    suggestAirports: builder.query({
      query: (q) => ({
        url: '/search/airports',
        method: 'GET',
        params: { q },
      }),
    }),
  }),
});

export const {
  useSearchFlightsMutation,
  useLazySuggestAirportsQuery,
} = searchApi;
