import React, { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useSearchParams } from 'react-router-dom';
import { Check, AlertCircle } from 'lucide-react';
import {
  selectWizard,
  startWizard,
  hydrateWizard,
  mapInquiryToWizard,
  buildDraftPayload,
} from '../../../REDUX_FEATURES/REDUX_SLICES/Inquiry_api/inquirySlice';
import {
  useGetInquiryQuery,
  useSaveDraftMutation,
} from '../../../REDUX_FEATURES/REDUX_SLICES/Inquiry_api/inquiryApi';
import StepCustomer from './wizard/StepCustomer';
import StepManualFlight from './wizard/StepManualFlight';
import StepPnrQuote from './wizard/StepPnrQuote';
import StepPassengers from './wizard/StepPassengers';
import StepBilling from './wizard/StepBilling';
import StepPreview from './wizard/StepPreview';

const STEPS = [
  'Customer Details',
  'Itinerary',
  'Pricing',
  'Passengers',
  'Quotation',
  'Preview & Authorize',
];

const InquiryWizard = () => {
  const dispatch = useDispatch();
  const wizard = useSelector(selectWizard);
  const [searchParams, setSearchParams] = useSearchParams();
  const hydratedId = useRef(null);
  const skipNextSave = useRef(false);

  const inquiryId = searchParams.get('inquiryId') || wizard.inquiryId;

  const { data: inquiryRes, isSuccess } = useGetInquiryQuery(inquiryId, {
    skip: !inquiryId,
  });
  const [saveDraft] = useSaveDraftMutation();

  useEffect(() => {
    if (inquiryId && wizard.inquiryId !== inquiryId) {
      dispatch(startWizard({ inquiryId }));
      hydratedId.current = null;
    }
  }, [inquiryId, dispatch, wizard.inquiryId]);

  // Resume: load draft from DB once per inquiry
  useEffect(() => {
    const inquiry = inquiryRes?.data?.inquiry;
    if (!isSuccess || !inquiry || hydratedId.current === inquiry._id) return;
    if (inquiry.status !== 'draft') return;

    skipNextSave.current = true;
    dispatch(hydrateWizard(mapInquiryToWizard(inquiry)));
    hydratedId.current = inquiry._id;
  }, [inquiryRes, isSuccess, dispatch]);

  // Autosave draft (debounced) after hydrate
  useEffect(() => {
    if (!wizard.inquiryId || hydratedId.current !== wizard.inquiryId) return;
    if (skipNextSave.current) {
      skipNextSave.current = false;
      return;
    }

    const t = setTimeout(() => {
      saveDraft({
        id: wizard.inquiryId,
        body: buildDraftPayload(wizard),
      })
        .unwrap()
        .catch(() => { });
    }, 700);

    return () => clearTimeout(t);
  }, [wizard, saveDraft]);

  if (!wizard.inquiryId) {
    return (
      <div className="inq-table-card">
        <div className="calls-empty-box">
          <div className="calls-empty-icon">
            <AlertCircle className="w-5 h-5 text-slate-400" />
          </div>
          <h3 className="calls-empty-title">No Draft Inquiry Loaded</h3>
          <p className="calls-empty-desc">
            To start a flight inquiry, record a call disposition with &quot;New booking&quot;.
          </p>
        </div>
      </div>
    );
  }

  const step = wizard.step || 0;

  return (
    <div className="space-y-4">
      {/* Modern Stepper Progress Bar */}
      <div className="bg-white border border-slate-200 rounded-lg p-3 sm:px-5 shadow-xs">
        <div className="flex items-center justify-between gap-2 overflow-x-auto py-1">
          {STEPS.map((label, i) => {
            const isActive = i === step;
            const isDone = i < step;

            return (
              <React.Fragment key={label}>
                <div className="flex items-center gap-2 text-xs font-semibold whitespace-nowrap">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold transition-all shrink-0 ${isActive
                        ? 'bg-sky-600 text-white shadow-xs'
                        : isDone
                          ? 'bg-slate-900 text-white'
                          : 'bg-slate-100 text-slate-400 border border-slate-200'
                      }`}
                  >
                    {isDone ? (
                      <Check className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
                    ) : (
                      i + 1
                    )}
                  </div>
                  <span
                    className={`${isActive
                        ? 'text-sky-700 font-bold'
                        : isDone
                          ? 'text-slate-900'
                          : 'text-slate-400 font-normal'
                      }`}
                  >
                    {label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 min-w-[12px] mx-1 transition-colors ${isDone ? 'bg-slate-900' : 'bg-slate-200'
                      }`}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Step Contents */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs">
        {step === 0 && <StepCustomer />}
        {step === 1 && <StepManualFlight />}
        {step === 2 && <StepPnrQuote />}
        {step === 3 && <StepPassengers />}
        {step === 4 && <StepBilling />}
        {step === 5 && (
          <StepPreview
            onDone={() => {
              setSearchParams({ tab: 'inquiries' });
            }}
          />
        )}
      </div>
    </div>
  );
};

export default InquiryWizard;
