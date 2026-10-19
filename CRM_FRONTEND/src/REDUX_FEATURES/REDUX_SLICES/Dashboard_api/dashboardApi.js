import { createApi } from '@reduxjs/toolkit/query/react';
import { axiosBaseQuery } from '../../../SERVICES/baseQuery';

export const dashboardApi = createApi({
  reducerPath: 'dashboardApi',
  baseQuery: axiosBaseQuery(),
  tagTypes: ['DashboardSummary'],
  endpoints: (builder) => ({
    getDashboardSummary: builder.query({
      query: ({ from, to }) => ({
        url: '/dashboard/summary',
        method: 'GET',
        params: { from, to },
      }),
      providesTags: ['DashboardSummary'],
    }),
  }),
});

export const { useGetDashboardSummaryQuery } = dashboardApi;
export default dashboardApi;
