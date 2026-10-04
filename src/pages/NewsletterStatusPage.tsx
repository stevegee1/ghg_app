import React from 'react';
import { Link, useSearchParams } from 'react-router-dom';

const MESSAGES: Record<string, { title: string; body: string }> = {
  confirmed: { title: 'You are subscribed', body: 'Thank you for confirming. You can unsubscribe from any newsletter email.' },
  unsubscribed: { title: 'You are unsubscribed', body: 'You will not receive the newsletter again. You can subscribe again at any time.' },
  invalid: { title: 'This link is not valid', body: 'It may have expired or already been used. You can subscribe again from the footer of any page.' },
  error: { title: 'Something went wrong', body: 'We could not complete that request. Please try again later.' },
};

/** Where the newsletter confirmation and unsubscribe links land. */
export const NewsletterStatusPage: React.FC = () => {
  const [params] = useSearchParams();
  const message = MESSAGES[params.get('status') ?? ''] ?? MESSAGES.invalid;
  return (
    <main className="newsletter-status container-x">
      <h1>{message.title}</h1>
      <p>{message.body}</p>
      <Link to="/" className="btn btn-primary">
        Back to the home page
      </Link>
    </main>
  );
};
