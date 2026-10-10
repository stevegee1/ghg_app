import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import type { MerchProduct } from '../../api/merch.types';

export type MerchProductsState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; products: MerchProduct[] };

/** Active merch items with their current prices, read from the catalogue API. */
export function useMerchProducts(): MerchProductsState {
  const [state, setState] = useState<MerchProductsState>({ status: 'loading' });
  useEffect(() => {
    let cancelled = false;
    api
      .getMerchProducts()
      .then((res) => !cancelled && setState({ status: 'ready', products: res.products }))
      .catch((err: Error) => !cancelled && setState({ status: 'error', message: err.message }));
    return () => {
      cancelled = true;
    };
  }, []);
  return state;
}

export const formatPence = (pence: number, currency = 'GBP') =>
  new Intl.NumberFormat('en-GB', { style: 'currency', currency }).format(pence / 100);
