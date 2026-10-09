import { createApi } from '@reduxjs/toolkit/query/react';
import { axiosBaseQuery } from '../../../SERVICES/baseQuery';

/** Airport suggest only — no flight search on this branch. */
export const searchApi = createApi({
  reducerPath: 'searchApi',
  baseQuery: axiosBaseQuery(),
  endpoints: (builder) => ({
    suggestAirports: builder.query({
      query: (q) => ({
        url: '/search/airports',
        method: 'GET',
        params: { q },
      }),
    }),
  }),
});

export const { useLazySuggestAirportsQuery } = searchApi;
