import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { PrismaModule } from './common/prisma/prisma.module';
import { CacheModule } from './common/cache/cache.module';
import { StorageModule } from './common/storage/storage.module';
import { HealthModule } from './health/health.module';
import { DoiModule } from './doi/doi.module';
import { AuthModule } from './auth/auth.module';
import { InstitutionsModule } from './institutions/institutions.module';
import { TaxonomyModule } from './taxonomy/taxonomy.module';
import { ResearchersModule } from './researchers/researchers.module';
import { SearchModule } from './search/search.module';
import { OrcidModule } from './orcid/orcid.module';
import { JobsModule } from './jobs/jobs.module';
import { ClaimsModule } from './claims/claims.module';
import { PublicationsModule } from './publications/publications.module';
import { ImportModule } from './import/import.module';
import { StatsModule } from './stats/stats.module';
import { AdminModule } from './admin/admin.module';
import { NotificationsModule } from './notifications/notifications.module';
import { CollectionsModule } from './collections/collections.module';
import { CommentsModule } from './comments/comments.module';
import { ReportsModule } from './reports/reports.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // Batas dasar publik 60 permintaan/menit; endpoint sensitif diperketat sendiri.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 60 }]),
    PrismaModule,
    CacheModule,
    StorageModule,
    AuthModule,
    HealthModule,
    InstitutionsModule,
    TaxonomyModule,
    ResearchersModule,
    SearchModule,
    OrcidModule,
    JobsModule,
    ClaimsModule,
    DoiModule,
    PublicationsModule,
    ImportModule,
    StatsModule,
    AdminModule,
    NotificationsModule,
    CollectionsModule,
    CommentsModule,
    ReportsModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
