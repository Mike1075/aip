export const checkNetworkConnection = async (): Promise<boolean> => {
  try {
    const response = await fetch('https://www.google.com/favicon.ico', {
      method: 'HEAD',
      mode: 'no-cors',
      cache: 'no-cache',
    })
    return true
  } catch {
    return false
  }
}

export const checkSupabaseConnection = async (): Promise<boolean> => {
  try {
    const response = await fetch('https://wfkazzdlfgurfmucuoqf.supabase.co/rest/v1/', {
      method: 'HEAD',
      headers: {
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indma2F6emRsZmd1cmZtdWN1b3FmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxNjI5NjQsImV4cCI6MjA2ODczODk2NH0.B-132nJtoXCKIuHmCHehnhOac8JohGs6rg4GjoV4v5M'
      }
    })
    return response.ok
  } catch {
    return false
  }
}