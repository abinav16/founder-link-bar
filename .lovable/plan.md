# Add Featured spots section to the FAQ

The Featured spot promotion is now live ($79/mo, 8 sidebar slots), but the FAQ page still only covers the free traffic exchange, billing, and widget install. Add a dedicated "Featured spots" category so founders and advertisers can self-serve common questions.

## What to build

1. **New FAQ category** in `src/routes/faq.tsx`:
   - Add "Featured spots" to `CATEGORIES`.
   - Insert 5 entries before "Billing":
     - What is a Featured spot?
     - How much does it cost and how long does it run?
     - Where will my startup appear?
     - Does it change my widget traffic or leaderboard position?
     - How do I book or cancel a Featured spot?
   - Keep answers factual, no invented traffic numbers, no hyphens/dashes in copy.

2. **Structured data update**:
   - Regenerate the FAQPage JSON-LD so the new questions are included automatically (the existing mapping already iterates `FAQS`).

3. **Verification**:
   - Build/typecheck passes.
   - `/faq` renders the new category and questions.
   - No console errors.
