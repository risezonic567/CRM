import { createApi } from '@reduxjs/toolkit/query/react';
import { axiosBaseQuery } from '../../../SERVICES/baseQuery';
import { callApi } from '../Call_api/callApi';

export const inquiryApi = createApi({
  reducerPath: 'inquiryApi',
  baseQuery: axiosBaseQuery(),
  tagTypes: ['Inquiries', 'Inquiry'],
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
      invalidatesTags: ['Inquiries', 'Inquiry'],
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
      invalidatesTags: ['Inquiries', 'Inquiry'],
    }),
    deleteInquiry: builder.mutation({
      query: (id) => ({
        url: `/inquiries/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Inquiries', 'Inquiry'],
    }),
  }),
});

export const {
  useListInquiriesQuery,
  useLookupInquiriesQuery,
  useLazyLookupInquiriesQuery,
  useGetInquiryQuery,
  useSaveDraftMutation,
  useSendInquiryMutation,
  useCloseInquiryMutation,
  useDeleteInquiryMutation,
} = inquiryApi;
