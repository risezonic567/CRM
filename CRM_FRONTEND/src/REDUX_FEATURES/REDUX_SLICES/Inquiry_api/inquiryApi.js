import { createApi } from '@reduxjs/toolkit/query/react';
import { axiosBaseQuery } from '../../../SERVICES/baseQuery';
import { callApi } from '../Call_api/callApi';

export const inquiryApi = createApi({
  reducerPath: 'inquiryApi',
  baseQuery: axiosBaseQuery(),
  tagTypes: ['Inquiries', 'Inquiry', 'InquiryMargin'],
  endpoints: (builder) => ({
    listInquiries: builder.query({
      query: (params) => ({
        url: '/inquiries',
        method: 'GET',
        params,
      }),
      providesTags: ['Inquiries'],
    }),
    lookupInquiries: builder.query({
      query: (q) => ({
        url: '/inquiries/lookup',
        method: 'GET',
        params: { q },
      }),
    }),
    getInquiryMarginStats: builder.query({
      query: () => ({
        url: '/inquiries/stats/margin',
        method: 'GET',
      }),
      providesTags: ['InquiryMargin'],
    }),
    getInquiry: builder.query({
      query: (id) => ({
        url: `/inquiries/${id}`,
        method: 'GET',
      }),
      providesTags: (_r, _e, id) => [{ type: 'Inquiry', id }],
    }),
    saveDraft: builder.mutation({
      query: ({ id, body }) => ({
        url: `/inquiries/${id}/draft`,
        method: 'PATCH',
        data: body,
      }),
      invalidatesTags: ['Inquiries'],
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          // Refresh calls list after inquiry→call name/phone sync
          dispatch(callApi.util.invalidateTags(['Calls']));
        } catch {
          /* mutation failed — leave Calls cache */
        }
      },
    }),
    sendInquiry: builder.mutation({
      query: ({ id, body }) => ({
        url: `/inquiries/${id}/send`,
        method: 'POST',
        data: body,
      }),
      invalidatesTags: ['Inquiries', 'Inquiry', 'InquiryMargin'],
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          dispatch(callApi.util.invalidateTags(['Calls']));
        } catch {
          /* mutation failed — leave Calls cache */
        }
      },
    }),
    closeInquiry: builder.mutation({
      query: ({ id, body }) => ({
        url: `/inquiries/${id}/close`,
        method: 'POST',
        data: body,
      }),
      invalidatesTags: ['Inquiries', 'Inquiry', 'InquiryMargin'],
    }),
    deleteInquiry: builder.mutation({
      query: (id) => ({
        url: `/inquiries/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Inquiries', 'Inquiry', 'InquiryMargin'],
    }),
  }),
});

export const {
  useListInquiriesQuery,
  useLookupInquiriesQuery,
  useLazyLookupInquiriesQuery,
  useGetInquiryMarginStatsQuery,
  useGetInquiryQuery,
  useSaveDraftMutation,
  useSendInquiryMutation,
  useCloseInquiryMutation,
  useDeleteInquiryMutation,
} = inquiryApi;
