import {CheckCircle2, Save} from 'lucide-react';
import {useEffect, useState, type FormEvent} from 'react';
import type {ClinicSettings} from '../../types/dental';

interface SettingsViewProps {
  settings: ClinicSettings;
  onSaveSettings: (settings: ClinicSettings) => Promise<boolean>;
}

const COUNTRIES = [
  'United Kingdom',
  'United States',
  'Canada',
  'Ireland',
  'Australia',
  'New Zealand',
  'Germany',
  'Netherlands',
];

const CURRENCIES: Array<{code: ClinicSettings['currency']; label: string}> = [
  {code: 'GBP', label: 'GBP (£) — British Pound'},
  {code: 'USD', label: 'USD ($) — US Dollar'},
  {code: 'EUR', label: 'EUR (€) — Euro'},
  {code: 'CAD', label: 'CAD (CA$) — Canadian Dollar'},
  {code: 'AUD', label: 'AUD (A$) — Australian Dollar'},
  {code: 'NZD', label: 'NZD (NZ$) — New Zealand Dollar'},
];

const TIMEZONES = [
  'Europe/London',
  'Europe/Dublin',
  'Europe/Berlin',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Toronto',
  'Australia/Sydney',
  'Pacific/Auckland',
];

export function SettingsView({settings, onSaveSettings}: SettingsViewProps) {
  const [clinicName, setClinicName] = useState(settings.clinicName);
  const [country, setCountry] = useState(settings.country);
  const [currency, setCurrency] = useState<ClinicSettings['currency']>(
    settings.currency,
  );
  const [timezone, setTimezone] = useState(settings.timezone);
  const [error, setError] = useState<string | null>(null);
  const [savedNotice, setSavedNotice] = useState(false);

  useEffect(() => {
    setClinicName(settings.clinicName);
    setCountry(settings.country);
    setCurrency(settings.currency);
    setTimezone(settings.timezone);
  }, [settings]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSavedNotice(false);

    if (clinicName.trim().length < 2) {
      setError('Please enter a clinic name.');
      return;
    }
    if (!country.trim()) {
      setError('Please select a country.');
      return;
    }

    const saved = await onSaveSettings({
      clinicName: clinicName.trim(),
      country,
      currency,
      timezone,
    });
    if (saved) {
      setSavedNotice(true);
      window.setTimeout(() => setSavedNotice(false), 3000);
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <section className="card-surface overflow-hidden rounded-2xl">
        <div className="border-b border-[#2D4458] bg-[#203344] px-6 py-4 text-white">
          <h2 className="text-base font-semibold text-white">
            Clinic Profile &amp; Preferences
          </h2>
          <p className="mt-0.5 text-xs text-slate-300">
            Changes update clinic details, currency display in Treatment Tracker, and
            message templates across this workspace.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 p-6" noValidate>
          <div>
            <label
              htmlFor="setting-clinic-name"
              className="block text-sm font-medium text-[#203344]"
            >
              Clinic Name
            </label>
            <input
              id="setting-clinic-name"
              type="text"
              value={clinicName}
              onChange={(e) => setClinicName(e.target.value)}
              placeholder="e.g. Harbourview Dental Practice"
              className="mt-1.5 block w-full rounded-lg border border-[#E6EAE7] px-3.5 py-2 text-sm text-[#203344] focus:border-[#174C4F] focus:outline-none focus:ring-2 focus:ring-[#174C4F]/15"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="setting-country"
                className="block text-sm font-medium text-[#203344]"
              >
                Country
              </label>
              <select
                id="setting-country"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="mt-1.5 block w-full rounded-lg border border-[#E6EAE7] bg-white px-3.5 py-2 text-sm text-[#203344] focus:border-[#174C4F] focus:outline-none"
              >
                {COUNTRIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="setting-currency"
                className="block text-sm font-medium text-[#203344]"
              >
                Currency
              </label>
              <select
                id="setting-currency"
                value={currency}
                onChange={(e) =>
                  setCurrency(e.target.value as ClinicSettings['currency'])
                }
                className="mt-1.5 block w-full rounded-lg border border-[#E6EAE7] bg-white px-3.5 py-2 text-sm text-[#203344] focus:border-[#174C4F] focus:outline-none"
              >
                {CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label
              htmlFor="setting-timezone"
              className="block text-sm font-medium text-[#203344]"
            >
              Timezone
            </label>
            <select
              id="setting-timezone"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="mt-1.5 block w-full rounded-lg border border-[#E6EAE7] bg-white px-3.5 py-2 text-sm text-[#203344] focus:border-[#174C4F] focus:outline-none sm:max-w-sm"
            >
              {TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </select>
          </div>

          {error && (
            <div role="alert" className="rounded-lg border border-[#C75C5C]/30 bg-[#C75C5C]/10 px-3.5 py-2 text-sm text-[#A64444]">
              {error}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#E6EAE7] pt-4">
            <div>
              {savedNotice && (
                <span className="inline-flex items-center gap-1.5 text-sm font-medium text-[#39856A]">
                  <CheckCircle2 className="h-4 w-4" />
                  Clinic settings updated
                </span>
              )}
            </div>
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-lg bg-[#174C4F] px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-[#123D40]"
            >
              <Save className="h-4 w-4" />
              Save Clinic Settings
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
