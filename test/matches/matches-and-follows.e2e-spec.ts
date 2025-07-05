import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';

describe('Fixtures, Favourites, and Follows (E2E)', () => {
  let app: INestApplication;
  let authToken: string;

  // --- Test Data ---
  // Use a real match and team ID that you know will exist on this date
  const testDate = '2022-07-24';
  const teamIdToFavourite = 2447; // Example: Manchester United
  const matchIdToFollow = 18528480; // Example: A specific match on that date

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // --- Get Auth Token ---
    // This is a placeholder. You should use a valid test user from your database.
    // In a real-world scenario, you might have a dedicated test user setup.
    // For now, we assume you have a way to get a valid token.
    // You can paste a valid token you generated from your get_token.html file here.
    authToken = 'eyJhbGciOiJSUzI1NiIsImtpZCI6IjNiZjA1MzkxMzk2OTEzYTc4ZWM4MGY0MjcwMzM4NjM2NDA2MTBhZGMiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL3NlY3VyZXRva2VuLmdvb2dsZS5jb20venBvcnRlci1iZDYyMiIsImF1ZCI6Inpwb3J0ZXItYmQ2MjIiLCJhdXRoX3RpbWUiOjE3NTA5ODc1MzYsInVzZXJfaWQiOiJKelQ3eEc2c1FoZUNNd05laUl3cDF2OEVMTTgzIiwic3ViIjoiSnpUN3hHNnNRaGVDTXdOZWlJd3AxdjhFTE04MyIsImlhdCI6MTc1MDk4NzUzNiwiZXhwIjoxNzUwOTkxMTM2LCJlbWFpbCI6InNpZmF0YWxhbWNlcDE2QGdtYWlsLmNvbSIsImVtYWlsX3ZlcmlmaWVkIjpmYWxzZSwiZmlyZWJhc2UiOnsiaWRlbnRpdGllcyI6eyJlbWFpbCI6WyJzaWZhdGFsYW1jZXAxNkBnbWFpbC5jb20iXX0sInNpZ25faW5fcHJvdmlkZXIiOiJwYXNzd29yZCJ9fQ.ZPuBx8UcsR-cWs-HajIwchuis5_rFV3RAnmhlMguBARuP6hYXvNNY2OGlY4N1ETICk02CpmKVjk83CxW8XWJ3_QnNDD95LNqwxg0qdsd9QomHaupNHmXggKra_IY6Cjx3z8TLnECAkKEyCffVqxq87yS7nGGXT7VT2C6peAjb936_Jisq0YX32D2qycJYDgFpszZlAJWqiq20DOm2lUGLm-dTp0HAz_icPQ-_lYienvEAg3bX-l0aeN_3Ny2uAa8w3_UK_ZOyLIqTK8zLymNzLoV7Wp6idRfnt2MkkvtnE5-j6Oj6JN-fFkB0YCT3DkMiPQqY9cNqwhET1WlhWALJA'; 

    // A simple check to ensure the token is not left as a placeholder
    if (authToken.startsWith('PASTE_YOUR')) {
        throw new Error("Please provide a valid Firebase ID token for testing in 'matches-and-follows.e2e-spec.ts'");
    }
  });

  // --- Main Fixture Endpoint Tests ---

  describe('GET /fixtures/categorized/by-date/:date', () => {
    it('should return a 401 Unauthorized error if no token is provided', () => {
      return request(app.getHttpServer())
        .get(`/fixtures/categorized/by-date/${testDate}`)
        .expect(401);
    });

    it('should return the categorized match list with a valid token', async () => {
      const response = await request(app.getHttpServer())
        .get(`/fixtures/categorized/by-date/${testDate}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Check for the correct response structure
      expect(response.body).toHaveProperty('following');
      expect(response.body).toHaveProperty('popular');
      expect(Array.isArray(response.body.following)).toBe(true);
      expect(Array.isArray(response.body.popular)).toBe(true);
    });
  });

  // --- Favourite Team Workflow ---

  describe('Favourite/Unfavourite Team Workflow', () => {
    it('should successfully favourite a team', () => {
      return request(app.getHttpServer())
        .post(`/teams/${teamIdToFavourite}/favourite`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(201); // 201 Created for a new favourite
    });

    it('should show the team as favourited in the match list', async () => {
      const response = await request(app.getHttpServer())
        .get(`/fixtures/categorized/by-date/${testDate}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      // Find a match with the favourited team and assert its status
      const matchWithFavouritedTeam = response.body.popular.find(
        match => match.homeTeam.id === teamIdToFavourite.toString() || match.awayTeam.id === teamIdToFavourite.toString()
      );
      
      expect(matchWithFavouritedTeam).toBeDefined();
      if (matchWithFavouritedTeam.homeTeam.id === teamIdToFavourite.toString()) {
          expect(matchWithFavouritedTeam.homeTeam.isFavorited).toBe(true);
      } else {
          expect(matchWithFavouritedTeam.awayTeam.isFavorited).toBe(true);
      }
    });

    it('should successfully unfavourite the team', () => {
      return request(app.getHttpServer())
        .post(`/teams/${teamIdToFavourite}/unfavourite`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect({}); // Expect an empty object on success
    });
  });

  // --- Follow Match Workflow ---

  describe('Follow/Unfollow Match Workflow', () => {
    it('should successfully follow a match', () => {
      return request(app.getHttpServer())
        .post(`/matches/${matchIdToFollow}/follow`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(201);
    });

    it('should move the followed match to the "following" list', async () => {
        const response = await request(app.getHttpServer())
          .get(`/fixtures/categorized/by-date/${testDate}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);
  
        // Assert that the match is now in the 'following' array
        const followedMatch = response.body.following.find(
            match => match.matchId === matchIdToFollow.toString()
        );
        expect(followedMatch).toBeDefined();

        // Assert that the match is no longer in the 'popular' array
        const popularMatch = response.body.popular.find(
            match => match.matchId === matchIdToFollow.toString()
        );
        expect(popularMatch).toBeUndefined();
    });

    it('should successfully unfollow the match', () => {
        return request(app.getHttpServer())
          .post(`/matches/${matchIdToFollow}/unfollow`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200)
          .expect({});
    });
  });

  afterAll(async () => {
    await app.close();
  });
});