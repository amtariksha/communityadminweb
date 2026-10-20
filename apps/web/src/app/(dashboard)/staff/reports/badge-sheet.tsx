import { QRCodeSVG } from 'qrcode.react';
import { type ReactNode } from 'react';
import type { BadgeCard, BadgeSheetData } from '@/hooks/use-staff-badges';

/**
 * STAFF-31 — A4 sheets of badge cards (CR80 size), front and back: the ID
 * card header image (else the society's name), photo, badge, name,
 * category, validity, and on the "with units & QR" and "QR" sheets the
 * flats served and the badge's QR (its opaque token, which the guard app
 * resolves). Photos and the header come as signed links; only https images
 * are drawn. Plain markup, so it prints from a static copy too.
 */

export type BadgeSheetVariant = 'badges' | 'badges_units_qr' | 'qr' | 'back';

const httpsImage = (url: string | null): string | null => (url && /^https:\/\/[^\s"'<>]+$/.test(url) ? url : null);

const validity = (card: BadgeCard): string => (card.badge_valid_until ? `Valid till ${card.badge_valid_until.split('-').reverse().join('/')}` : 'No expiry');

export const BADGE_SHEET_STYLE = `
  .badge-sheet { display: flex; flex-wrap: wrap; gap: 6mm; font-family: Arial, sans-serif; }
  .badge-card { width: 54mm; height: 86mm; border: 1px solid #333; border-radius: 6px; padding: 3mm; box-sizing: border-box; font-size: 11px; page-break-inside: avoid; overflow: hidden; }
  .badge-card .top { text-align: center; border-bottom: 1px solid #ccc; padding-bottom: 2mm; margin-bottom: 2mm; }
  .badge-card .top img { max-width: 100%; max-height: 14mm; object-fit: contain; }
  .badge-card .photo { width: 22mm; height: 26mm; object-fit: cover; display: block; margin: 0 auto 2mm; border: 1px solid #ddd; }
  .badge-card .number { font-size: 18px; font-weight: 700; }
  .badge-card .name { font-size: 13px; font-weight: 600; }
  .badge-card .back { white-space: pre-wrap; }
`;

function CardTop({ sheet }: { sheet: BadgeSheetData }): ReactNode {
  const header = httpsImage(sheet.header_image_url);
  return <div className="top">{header ? <img src={header} alt="" /> : <strong>{sheet.society_name}</strong>}</div>;
}

function FrontCard({ card, sheet, variant }: { card: BadgeCard; sheet: BadgeSheetData; variant: Exclude<BadgeSheetVariant, 'back'> }): ReactNode {
  const photo = httpsImage(card.photo_url);
  const withQr = variant !== 'badges';
  return (
    <div className="badge-card" data-side="front">
      <CardTop sheet={sheet} />
      {variant !== 'qr' && photo && <img className="photo" src={photo} alt="" />}
      <div className="number">{card.badge_no}</div>
      <div className="name">{card.name}</div>
      {variant !== 'qr' && <div>{card.category ?? ''}</div>}
      {variant === 'badges_units_qr' && card.units && <div>Units: {card.units}</div>}
      {variant !== 'qr' && <div>{validity(card)}</div>}
      {withQr && (
        <div style={{ marginTop: '2mm', textAlign: 'center' }}>
          <QRCodeSVG value={card.qr_token} size={variant === 'qr' ? 120 : 80} />
        </div>
      )}
    </div>
  );
}

/** The cards of one sheet: fronts of the variant, or the back side once per card. */
export function BadgeSheet({ sheet, variant }: { sheet: BadgeSheetData; variant: BadgeSheetVariant }): ReactNode {
  if (variant === 'back') {
    return (
      <div className="badge-sheet">
        {sheet.cards.map((card) => (
          <div key={card.badge_no} className="badge-card" data-side="back">
            <CardTop sheet={sheet} />
            <div className="back">{sheet.back_text}</div>
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="badge-sheet">
      {sheet.cards.map((card) => (
        <FrontCard key={card.badge_no} card={card} sheet={sheet} variant={variant} />
      ))}
    </div>
  );
}
