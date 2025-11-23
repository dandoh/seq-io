import { createFileRoute, redirect } from '@tanstack/react-router'
import { AppPage } from './app'
import { LandingPage } from './landing'

export const Route = createFileRoute('/')({
  beforeLoad: async ({ context }) => {
    if (import.meta.env.DEV) {
      return redirect({
        to: '/app',
      })
    }

    return redirect({
      to: '/landing',
    })
  },
})
