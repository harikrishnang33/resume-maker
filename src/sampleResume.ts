import type { ResumeDoc, ResumeNode } from './types';
import { DEFAULT_SPACING, SCHEMA_VERSION } from './types';

// Stable ids so the seed is deterministic across reloads.
let n = 0;
const id = (s: string) => `seed_${s}_${n++}`;

const bullet = (content: string, visible = true): ResumeNode => ({
  id: id('b'),
  type: 'bullet',
  visible,
  content,
});

const summary = (content: string, visible: boolean): ResumeNode => ({
  id: id('sum'),
  type: 'summary',
  visible,
  content,
});

const experience: ResumeNode = {
  id: id('sec'),
  type: 'section',
  visible: true,
  props: { title: 'Experience' },
  children: [
    {
      id: id('sub'),
      type: 'subsection',
      visible: true,
      props: { heading: 'Backend Engineer, <a href="https://www.ultrahuman.com">Ultrahuman</a>', date: 'Mar 2026 – Present' },
      children: [
        bullet(
          'Designed a <b>generic upsell card framework</b> for <b>1.2M active users</b> with pluggable trigger evaluators powering C&amp;O Pro, Cardio and AFib upsells, generating <b>$82K in yearly subscription revenue</b> over 3 months.',
        ),
        bullet(
          'Built a <b>personalized mental health content recommendation engine</b> triggered by 15 emotional smart tags, with intent-tiered article journeys, gender-scoped configs, status tracking, and frequency capping.',
        ),
        bullet(
          'Developed a YAML-driven <b>Blood Vision retest upsell</b> (multiple biomarker groups, weighted scoring) with abandoned-cart recovery, part of a growth initiative <b>projected at $110–180K quarterly</b>.',
        ),
        bullet(
          'Implemented a CI job to detect unauthenticated API endpoints via controller callback chain inspection.',
        ),
        bullet(
          'Built <b>Shopify fulfillment sync</b> pushing post-shipment tracking links for automated chargeback evidence, plus an HMAC-verified disputes webhook and <b>real-time Slack alerts</b> for chargeback visibility.',
        ),
        bullet(
          'Fixed duplicate CGM shipments from Stripe webhook retries by implementing <b>idempotency via event-ID deduplication</b> and a DB unique index.',
        ),
      ],
    },
    {
      id: id('sub'),
      type: 'subsection',
      visible: true,
      props: {
        heading: 'Senior Software Engineer, <a href="https://www.keyvalue.systems">KeyValue Software Systems</a>',
        date: 'July 2021 – Feb 2026',
      },
      children: [
        bullet(
          'Designed a <b>SQL-backed queue</b> that feeds the multi-provider image/video generation pipeline, pacing high-throughput requests within each provider’s rate limits.',
        ),
        bullet(
          'Built an <b>extensible multi-provider architecture</b> for image and video generation models, powering ad-creative generation for <b>73K users</b>, with chat-based generation agents (<b>Google ADK</b>) as a natural-language alternative to manual configuration.',
        ),
        bullet(
          'Introduced <b>multi-tenancy</b> to the backend using a tenant ID and async local storage to scope every request, enabling multiple clients to run on a single codebase with <b>isolated data.</b>',
        ),
        bullet(
          '<b>Cut query latency 10–20%</b> on a paginated endpoint by dropping the default count query and fetching one extra record for next-page detection.',
        ),
        bullet(
          'Unified the notification service’s authentication behind a single interceptor with custom validators, replacing inconsistent per-request-type handling with one consistent auth contract.',
        ),
        bullet(
          'Opened a <b>new marketplace revenue line</b> by building a <b>platform-fee capability</b> in OMS that charges retailers a per-order fee based on the order value, configurable via an admin panel.',
        ),
        bullet(
          'Built <b>shipment-level delivery-fee computation</b> that splits an order’s delivery fee across its shipments pro rata by shipment value, closing a loophole where retailers dodged the fee by cancelling the one shipment it was charged to.',
        ),
        bullet(
          'Automated <b>seller payouts</b> for shipments fulfilled by third-party sellers, eliminating miscalculated manual payouts and the on-call escalations they had been causing.',
        ),
        bullet(
          'Enabled a <b>40–50% cost reduction</b> for a <b>200K-user</b> base by migrating order report generation from BigQuery to self-hosted MongoDB in Go + Gin.',
        ),
        bullet(
          '<b>Eliminated a recurring on-call incident</b> by generating order reports reliably on each shipment’s terminal-state transition, via an async Spring <b>@TransactionalEventListener</b> that fires only after the database commit.',
        ),
        bullet(
          'Built <b>segment-aware pickup-point discounting</b> that applies a rule-engine discount by customer segment, location, and order value, replacing a single flat discount.',
        ),
        bullet(
          'Built a <b>cash reconciliation system</b> for delivery drivers and cash collectors that tracks collections and confirms deposits through to settlement.',
        ),
        bullet(
          'Shipped a <b>post-delivery feedback system over WhatsApp</b> using Twilio with an SQS-and-lambda pipeline that surveys customers after their last delivery and stores responses in DynamoDB.',
        ),
        bullet(
          'Built a <b>shared wishlist microservice</b> (serverless) powering wishlist across the retailer PWA and consumer app.',
        ),
      ],
    },
  ],
};

const education: ResumeNode = {
  id: id('sec'),
  type: 'section',
  visible: true,
  props: { title: 'Education' },
  children: [
    {
      id: id('sub'),
      type: 'subsection',
      visible: true,
      props: {
        heading: 'Government Engineering College, Thrissur, B.Tech in Computer Science',
        date: 'Aug 2017 – June 2021',
      },
      children: [bullet('CGPA: 8.48/10.0')],
    },
  ],
};

const technologies: ResumeNode = {
  id: id('sec'),
  type: 'section',
  visible: true,
  props: { title: 'Technologies' },
  children: [
    {
      id: id('grid'),
      type: 'gridContainer',
      visible: true,
      props: { columns: 2 },
      children: [
        { id: id('gi'), type: 'gridItem', visible: true, props: { label: '<b>Languages:</b>', value: 'TypeScript, Go, Ruby, Python and Java' } },
        { id: id('gi'), type: 'gridItem', visible: true, props: { label: '<b>Databases:</b>', value: 'PostgreSQL, MySQL, MongoDB, Redis' } },
        { id: id('gi'), type: 'gridItem', visible: true, props: { label: '<b>Frameworks:</b>', value: 'Node.js, Gin, Ruby on Rails, FastAPI, Spring Boot' } },
        {
          id: id('gi'),
          type: 'gridItem',
          visible: true,
          props: { label: '<b>Other tools:</b>', value: 'Git, Docker, ArgoCD, Grafana, NewRelic, AWS, Stripe &amp; Shopify API' },
        },
      ],
    },
  ],
};

const header: ResumeNode = {
  id: id('header'),
  type: 'header',
  visible: true,
  children: [
    { id: id('name'), type: 'name', visible: true, content: 'Harikrishnan G' },
    {
      id: id('crow'),
      type: 'contactRow',
      visible: true,
      children: [
        { id: id('ci'), type: 'contactItem', visible: true, props: { icon: 'email' }, content: 'hari.krishnan.g.0303@gmail.com' },
        { id: id('ci'), type: 'contactItem', visible: true, props: { icon: 'phone' }, content: '+91 9446954376' },
        { id: id('ci'), type: 'contactItem', visible: true, props: { icon: 'location' }, content: 'Karnataka' },
      ],
    },
    {
      id: id('crow'),
      type: 'contactRow',
      visible: true,
      children: [
        { id: id('ci'), type: 'contactItem', visible: true, props: { icon: 'linkedin' }, content: 'harikrishnang33' },
        { id: id('ci'), type: 'contactItem', visible: true, props: { icon: 'github' }, content: 'harikrishnang33' },
      ],
    },
    summary(
      '<b>Senior Software Engineer with 5 years of backend experience</b> building scalable systems across health-tech, e-commerce, ad-tech, and ed-tech. Built end-to-end features spanning payment infrastructure, ML microservices, and revenue growth systems. Experienced with Node.js, Go, Ruby on Rails, Python and Spring Boot.',
      true,
    ),
    summary(
      '<b>Senior Software Engineer with 5 years of backend experience</b> across e-commerce and health-tech, building pricing, discounts, fees, reporting, and revenue-growth systems.',
      false,
    ),
    summary(
      '<b>Senior Software Engineer with 5 years of backend experience</b> across payments and health-tech, building cash reconciliation, payouts, fees, and revenue-growth systems.',
      false,
    ),
    summary(
      '<b>Senior Software Engineer with 5 years of backend experience</b> across last-mile logistics and health-tech, building shipment events, delivery scheduling, driver reconciliation, and revenue-growth systems.',
      false,
    ),
  ],
};

export const sampleResume: ResumeDoc = {
  schema: SCHEMA_VERSION,
  page: { size: 'A4', marginMm: 12 },
  type: { baseSizePt: 10, lineHeight: 1.2, fontFamily: 'Charter' },
  spacing: { ...DEFAULT_SPACING },
  root: {
    id: 'root',
    type: 'document',
    visible: true,
    children: [header, experience, education, technologies],
  },
};
