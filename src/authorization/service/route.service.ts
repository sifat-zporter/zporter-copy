import { Injectable } from '@nestjs/common';
import { db } from '../../config/firebase.config';
import { CreateRouteDto } from '../dto/create-route.dto';
import { RouteEntity } from '../entities/route.entity';

@Injectable()
export class RouteService {
  /**
   * Create and update all routes of app while runnig the first time.
   * @param stacks Stacks about information of this app
   */
  async initRouteWhenAppStart(stacks: any[]) {
    const routeRef = await db.collection('routes').get();
    const routes: string[] = routeRef.docs.map((e) => e.data().routeId);
    const paths: string[] = stacks
      .map((layer) => {
        const path: string = layer.route?.path || null;
        const method = layer.route?.stack[0].method;

        if (path && method && path != '*' && path != undefined) {
          return this.generateRouteId(
            layer.route.path,
            layer.route.stack[0].method,
          );
        }
      })
      .filter((e) => e);

    await this.createExtraRoute(paths, routes);
    await this.deleteNeedlessRoute(routes, paths);
  }

  /**
   * Delete all routes that are not used anymore.
   * @param routes array routes were saved in database
   * @param paths array routes of apps in this running
   */
  async deleteNeedlessRoute(routes: string[], paths: string[]) {
    const deleteRoutes = routes
      .map((routeId) => {
        if (paths.includes(routeId) == false) {
          return this.deleteRoute(routeId);
        } else return null;
      })
      .filter((e) => e);
    await Promise.all(deleteRoutes);
  }

  /**
   * Create all routes that are existed in app, but database have no.
   * @param paths array routes of apps in this running
   * @param routes array routes were saved in database
   */
  async createExtraRoute(paths: any[], routes: any[]) {
    const createRoutes = paths
      .map((path) => {
        if (routes.includes(path) == false) {
          const { path: newPath, method } = this.convertRouteId(path);

          return this.createNewRoute({ method, path: newPath });
        } else return null;
      })
      .filter((e) => e);
    await Promise.all(createRoutes);
  }

  async getAllRoutes() {
    return await (
      await db.collection('routes').get()
    ).docs.map((e) => e.data().routeId);
  }
  async createNewRoute(createRouteDto: CreateRouteDto) {
    const { path, method } = createRouteDto;
    const deleted = createRouteDto.deleted ? createRouteDto.deleted : false;

    const newRouteId = this.generateRouteId(path as string, method);
    const newRoute = new RouteEntity(newRouteId, path, method, deleted);

    return await db
      .collection('routes')
      .doc(newRouteId)
      .set({ ...newRoute }, { merge: true });
  }

  async deleteRoute(routeId: string) {
    return await db.collection('routes').doc(routeId).delete();
  }

  generateRouteId(path: string, method: string): string {
    const pathForId = path.replace(/\//g, '*');
    const newRouteId = `${method}_${pathForId}`;
    return newRouteId;
  }

  convertRouteId(routeId: string) {
    const [method, rawPath] = routeId.split('_');
    const path = rawPath.replace(/\*/g, '/');
    return {
      method,
      path,
    };
  }
}
