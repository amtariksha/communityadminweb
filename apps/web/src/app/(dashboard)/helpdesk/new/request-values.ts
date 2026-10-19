import type { FormMode } from '@/components/form-page';
import type { CategoryChoice } from '../../tickets/category-choices';
import { requestSubject } from './request-fields';
import type { UploadedFiles } from './use-request-files';

/** Personal (one unit, the default) or Community (the common areas) — HELP-15. */
export type RequestType = 'personal' | 'community';

/** What the Create Request form holds. */
export interface RequestValues {
  requestType: RequestType;
  unitId: string;
  text: string;
  category: string;
  /** One of the category's sub-categories, or '' (HELP-17). */
  subcategoryId: string;
  // Classic: "This is urgent!"; standard: the Priority select ('' = category default).
  urgent: boolean;
  priority: string;
  /** YYYY-MM-DD, or '' (HELP-16). */
  serviceDate: string;
}

export const EMPTY_REQUEST: RequestValues = {
  requestType: 'personal',
  unitId: '',
  text: '',
  category: '',
  subcategoryId: '',
  urgent: false,
  priority: '',
  serviceDate: '',
};

/** What to send for the chosen category: its id, and its name for an older server. */
function categoryFields(choices: readonly CategoryChoice[], value: string): { category_id?: string; category: string } {
  const choice = choices.find((entry) => entry.value === value);
  return choice?.categoryId ? { category_id: choice.categoryId, category: choice.label } : { category: value };
}

/** The POST /tickets body; a Community request names no unit. */
export function requestBody(values: RequestValues, mode: FormMode, choices: readonly CategoryChoice[], files: UploadedFiles) {
  const priority = mode === 'page' ? (values.urgent ? 'urgent' : '') : values.priority;
  const personal = values.requestType === 'personal';
  return {
    request_type: values.requestType,
    subject: requestSubject(values.text),
    description: values.text.trim(),
    ...categoryFields(choices, values.category),
    ...(values.subcategoryId ? { subcategory_id: values.subcategoryId } : {}),
    ...(priority ? { priority } : {}),
    ...(personal && values.unitId ? { unit_id: values.unitId } : {}),
    ...(values.serviceDate ? { preferred_service_date: values.serviceDate } : {}),
    ...(files.urls.length > 0 ? { attachment_urls: files.urls, attachment_names: files.names } : {}),
  };
}
