import { createFormHook } from '@tanstack/react-form'

import {
  Select,
  SubscribeButton,
  TextArea,
  TextField,
  NumberField,
  RadioGroupField,
} from '../components/form-components'
import { fieldContext, formContext } from './form-context'

export const { useAppForm } = createFormHook({
  fieldComponents: {
    TextField,
    NumberField,
    Select,
    TextArea,
    RadioGroupField,
  },
  formComponents: {
    SubscribeButton,
  },
  fieldContext,
  formContext,
})
