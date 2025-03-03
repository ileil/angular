/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {CommonModule, Location} from '@angular/common';
import {SpyLocation} from '@angular/common/testing';
import {Component, Injectable, NgModule} from '@angular/core';
import {ComponentFixture, fakeAsync, TestBed, tick} from '@angular/core/testing';
import {expect} from '@angular/platform-browser/testing/src/matchers';
import {CanActivate, CanDeactivate, Resolve, Router, RouterModule, UrlTree} from '@angular/router';
import {EMPTY, Observable, of} from 'rxjs';

import {isUrlTree} from '../src/url_tree';
import {RouterTestingModule} from '../testing';

describe('`restoredState#ɵrouterPageId`', () => {
  @Injectable({providedIn: 'root'})
  class MyCanDeactivateGuard implements CanDeactivate<any> {
    allow: boolean = true;
    canDeactivate(): boolean {
      return this.allow;
    }
  }

  @Injectable({providedIn: 'root'})
  class ThrowingCanActivateGuard implements CanActivate {
    throw = false;

    constructor(private router: Router) {}

    canActivate(): boolean {
      if (this.throw) {
        throw new Error('error in guard');
      }
      return true;
    }
  }

  @Injectable({providedIn: 'root'})
  class MyCanActivateGuard implements CanActivate {
    allow: boolean = true;
    redirectTo: string|null|UrlTree = null;

    constructor(private router: Router) {}

    canActivate(): boolean|UrlTree {
      if (typeof this.redirectTo === 'string') {
        this.router.navigateByUrl(this.redirectTo);
      } else if (isUrlTree(this.redirectTo)) {
        return this.redirectTo;
      }
      return this.allow;
    }
  }
  @Injectable({providedIn: 'root'})
  class MyResolve implements Resolve<Observable<any>> {
    myresolve: Observable<any> = of(2);
    resolve(): Observable<any> {
      return this.myresolve;
    }
  }

  let fixture: ComponentFixture<unknown>;

  beforeEach(fakeAsync(() => {
    TestBed.configureTestingModule({
      imports: [TestModule],
      providers: [
        {provide: 'alwaysFalse', useValue: (a: any) => false},
        {provide: Location, useClass: SpyLocation}
      ]
    });
    const router = TestBed.inject(Router);
    const location = TestBed.inject(Location);
    fixture = createRoot(router, RootCmp);
    router.resetConfig([
      {
        path: 'first',
        component: SimpleCmp,
        canDeactivate: [MyCanDeactivateGuard],
        canActivate: [MyCanActivateGuard, ThrowingCanActivateGuard],
        resolve: {x: MyResolve}
      },
      {
        path: 'second',
        component: SimpleCmp,
        canDeactivate: [MyCanDeactivateGuard],
        canActivate: [MyCanActivateGuard, ThrowingCanActivateGuard],
        resolve: {x: MyResolve}
      },
      {
        path: 'third',
        component: SimpleCmp,
        canDeactivate: [MyCanDeactivateGuard],
        canActivate: [MyCanActivateGuard, ThrowingCanActivateGuard],
        resolve: {x: MyResolve}
      },
      {
        path: 'unguarded',
        component: SimpleCmp,
      },
      {
        path: 'throwing',
        component: ThrowingCmp,
      },
      {path: 'loaded', loadChildren: () => of(ModuleWithSimpleCmpAsRoute), canLoad: ['alwaysFalse']}
    ]);
    router.navigateByUrl('/first');
    advance(fixture);
    expect(location.getState()).toEqual(jasmine.objectContaining({ɵrouterPageId: 1}));

    router.navigateByUrl('/second');
    advance(fixture);
    expect(location.getState()).toEqual(jasmine.objectContaining({ɵrouterPageId: 2}));

    router.navigateByUrl('/third');
    advance(fixture);
    expect(location.getState()).toEqual(jasmine.objectContaining({ɵrouterPageId: 3}));

    location.back();
    advance(fixture);
  }));

  it('should work when CanActivate returns false', fakeAsync(() => {
       const location = TestBed.inject(Location);
       const router = TestBed.inject(Router);
       expect(location.path()).toEqual('/second');
       expect(location.getState()).toEqual(jasmine.objectContaining({ɵrouterPageId: 2}));

       TestBed.inject(MyCanActivateGuard).allow = false;
       location.back();
       advance(fixture);
       expect(location.path()).toEqual('/second');
       expect(location.getState()).toEqual(jasmine.objectContaining({ɵrouterPageId: 2}));

       TestBed.inject(MyCanActivateGuard).allow = true;
       location.back();
       advance(fixture);
       expect(location.path()).toEqual('/first');
       expect(location.getState()).toEqual(jasmine.objectContaining({ɵrouterPageId: 1}));

       TestBed.inject(MyCanActivateGuard).allow = false;
       location.forward();
       advance(fixture);
       expect(location.path()).toEqual('/first');
       expect(location.getState()).toEqual(jasmine.objectContaining({ɵrouterPageId: 1}));

       router.navigateByUrl('/second');
       advance(fixture);
       expect(location.path()).toEqual('/first');
       expect(location.getState()).toEqual(jasmine.objectContaining({ɵrouterPageId: 1}));
     }));


  it('should work when CanDeactivate returns false', fakeAsync(() => {
       const location = TestBed.inject(Location);
       const router = TestBed.inject(Router);

       TestBed.inject(MyCanDeactivateGuard).allow = false;
       location.back();
       advance(fixture);
       expect(location.path()).toEqual('/second');
       expect(location.getState()).toEqual(jasmine.objectContaining({ɵrouterPageId: 2}));

       location.forward();
       advance(fixture);
       expect(location.path()).toEqual('/second');
       expect(location.getState()).toEqual(jasmine.objectContaining({ɵrouterPageId: 2}));

       router.navigateByUrl('third');
       advance(fixture);
       expect(location.path()).toEqual('/second');
       expect(location.getState()).toEqual(jasmine.objectContaining({ɵrouterPageId: 2}));


       TestBed.inject(MyCanDeactivateGuard).allow = true;
       location.forward();
       advance(fixture);
       expect(location.path()).toEqual('/third');
       expect(location.getState()).toEqual(jasmine.objectContaining({ɵrouterPageId: 3}));
     }));

  it('should work when using `NavigationExtras.skipLocationChange`', fakeAsync(() => {
       const location = TestBed.inject(Location);
       const router = TestBed.inject(Router);

       expect(location.path()).toEqual('/second');
       expect(location.getState()).toEqual(jasmine.objectContaining({ɵrouterPageId: 2}));

       router.navigateByUrl('/first', {skipLocationChange: true});
       advance(fixture);
       expect(location.getState()).toEqual(jasmine.objectContaining({ɵrouterPageId: 2}));

       router.navigateByUrl('/third');
       advance(fixture);
       expect(location.getState()).toEqual(jasmine.objectContaining({ɵrouterPageId: 3}));

       location.back();
       advance(fixture);
       expect(location.getState()).toEqual(jasmine.objectContaining({ɵrouterPageId: 2}));
     }));

  it('should work when using `NavigationExtras.replaceUrl`', fakeAsync(() => {
       const location = TestBed.inject(Location);
       const router = TestBed.inject(Router);

       expect(location.path()).toEqual('/second');
       expect(location.getState()).toEqual(jasmine.objectContaining({ɵrouterPageId: 2}));

       router.navigateByUrl('/first', {replaceUrl: true});
       advance(fixture);
       expect(location.getState()).toEqual(jasmine.objectContaining({ɵrouterPageId: 2}));
       expect(location.path()).toEqual('/first');
     }));

  it('should work when CanLoad returns false', fakeAsync(() => {
       const location = TestBed.inject(Location);
       const router = TestBed.inject(Router);

       router.navigateByUrl('/loaded');
       advance(fixture);
       expect(location.path()).toEqual('/second');
       expect(location.getState()).toEqual(jasmine.objectContaining({ɵrouterPageId: 2}));
     }));

  it('should work when resolve empty', fakeAsync(() => {
       const location = TestBed.inject(Location);
       const router = TestBed.inject(Router);

       expect(location.path()).toEqual('/second');
       expect(location.getState()).toEqual(jasmine.objectContaining({ɵrouterPageId: 2}));

       TestBed.inject(MyResolve).myresolve = EMPTY;

       location.back();
       advance(fixture);
       expect(location.getState()).toEqual(jasmine.objectContaining({ɵrouterPageId: 2}));
       expect(location.path()).toEqual('/second');

       TestBed.inject(MyResolve).myresolve = of(2);

       location.back();
       advance(fixture);
       expect(location.getState()).toEqual(jasmine.objectContaining({ɵrouterPageId: 1}));
       expect(location.path()).toEqual('/first');

       TestBed.inject(MyResolve).myresolve = EMPTY;

       // We should cancel the navigation to `/third` when myresolve is empty
       router.navigateByUrl('/third');
       advance(fixture);
       expect(location.getState()).toEqual(jasmine.objectContaining({ɵrouterPageId: 1}));
       expect(location.path()).toEqual('/first');

       location.historyGo(2);
       advance(fixture);
       expect(location.getState()).toEqual(jasmine.objectContaining({ɵrouterPageId: 1}));
       expect(location.path()).toEqual('/first');

       TestBed.inject(MyResolve).myresolve = of(2);
       location.historyGo(2);
       advance(fixture);
       expect(location.getState()).toEqual(jasmine.objectContaining({ɵrouterPageId: 3}));
       expect(location.path()).toEqual('/third');

       TestBed.inject(MyResolve).myresolve = EMPTY;
       location.historyGo(-2);
       advance(fixture);
       expect(location.getState()).toEqual(jasmine.objectContaining({ɵrouterPageId: 3}));
       expect(location.path()).toEqual('/third');
     }));


  it('should work when an error occured during navigation', fakeAsync(() => {
       const location = TestBed.inject(Location);
       const router = TestBed.inject(Router);

       expect(location.path()).toEqual('/second');
       expect(location.getState()).toEqual(jasmine.objectContaining({ɵrouterPageId: 2}));


       router.navigateByUrl('/invalid').catch(() => null);
       advance(fixture);
       expect(location.path()).toEqual('/second');
       expect(location.getState()).toEqual(jasmine.objectContaining({ɵrouterPageId: 2}));

       location.back();
       advance(fixture);
       expect(location.path()).toEqual('/first');
       expect(location.getState()).toEqual(jasmine.objectContaining({ɵrouterPageId: 1}));
     }));

  it('should work when urlUpdateStrategy="eager"', fakeAsync(() => {
       const location = TestBed.inject(Location) as SpyLocation;
       const router = TestBed.inject(Router);
       expect(location.path()).toEqual('/second');
       expect(location.getState()).toEqual(jasmine.objectContaining({ɵrouterPageId: 2}));
       router.urlUpdateStrategy = 'eager';

       TestBed.inject(MyCanActivateGuard).allow = false;
       router.navigateByUrl('/first');
       advance(fixture);
       expect(location.path()).toEqual('/second');
       expect(location.getState()).toEqual(jasmine.objectContaining({ɵrouterPageId: 2}));

       location.back();
       advance(fixture);
       expect(location.path()).toEqual('/second');
       expect(location.getState()).toEqual(jasmine.objectContaining({ɵrouterPageId: 2}));
     }));

  it('should work when CanActivate redirects', fakeAsync(() => {
       const location = TestBed.inject(Location);

       TestBed.inject(MyCanActivateGuard).redirectTo = '/unguarded';
       location.back();
       advance(fixture);
       expect(location.path()).toEqual('/unguarded');
       expect(location.getState()).toEqual(jasmine.objectContaining({ɵrouterPageId: 2}));

       TestBed.inject(MyCanActivateGuard).redirectTo = null;

       location.back();
       advance(fixture);
       expect(location.path()).toEqual('/first');
       expect(location.getState()).toEqual(jasmine.objectContaining({ɵrouterPageId: 1}));
     }));

  it('should work when CanActivate redirects and urlUpdateStrategy="eager"', fakeAsync(() => {
       const location = TestBed.inject(Location);
       const router = TestBed.inject(Router);
       router.urlUpdateStrategy = 'eager';

       TestBed.inject(MyCanActivateGuard).redirectTo = '/unguarded';
       router.navigateByUrl('/third');
       advance(fixture);
       expect(location.path()).toEqual('/unguarded');
       expect(location.getState()).toEqual(jasmine.objectContaining({ɵrouterPageId: 4}));

       TestBed.inject(MyCanActivateGuard).redirectTo = null;

       location.back();
       advance(fixture);
       expect(location.path()).toEqual('/third');
       expect(location.getState()).toEqual(jasmine.objectContaining({ɵrouterPageId: 3}));
     }));

  it('should work when CanActivate redirects with UrlTree and urlUpdateStrategy="eager"',
     fakeAsync(() => {
       // Note that this test is different from the above case because we are able to specifically
       // handle the `UrlTree` case as a proper redirect and set `replaceUrl: true` on the
       // follow-up navigation.
       const location = TestBed.inject(Location);
       const router = TestBed.inject(Router);
       router.urlUpdateStrategy = 'eager';

       TestBed.inject(MyCanActivateGuard).redirectTo = router.createUrlTree(['unguarded']);
       router.navigateByUrl('/third');
       advance(fixture);
       expect(location.path()).toEqual('/unguarded');
       expect(location.getState()).toEqual(jasmine.objectContaining({ɵrouterPageId: 3}));

       TestBed.inject(MyCanActivateGuard).redirectTo = null;

       location.back();
       advance(fixture);
       expect(location.path()).toEqual('/second');
       expect(location.getState()).toEqual(jasmine.objectContaining({ɵrouterPageId: 2}));
     }));

  for (const urlUpdateSrategy of ['deferred', 'eager'] as const) {
    it(`restores history correctly when an error is thrown in guard with urlUpdateStrategy ${
           urlUpdateSrategy}`,
       fakeAsync(() => {
         const location = TestBed.inject(Location);
         const router = TestBed.inject(Router);
         router.urlUpdateStrategy = urlUpdateSrategy;

         TestBed.inject(ThrowingCanActivateGuard).throw = true;

         expect(() => {
           location.back();
           advance(fixture);
         }).toThrow();
         expect(location.path()).toEqual('/second');
         expect(location.getState()).toEqual(jasmine.objectContaining({ɵrouterPageId: 2}));

         TestBed.inject(ThrowingCanActivateGuard).throw = false;
         location.back();
         advance(fixture);
         expect(location.path()).toEqual('/first');
         expect(location.getState()).toEqual(jasmine.objectContaining({ɵrouterPageId: 1}));
       }));

    it(`restores history correctly when component throws error in constructor with urlUpdateStrategy ${
           urlUpdateSrategy}`,
       fakeAsync(() => {
         const location = TestBed.inject(Location);
         const router = TestBed.inject(Router);
         router.urlUpdateStrategy = urlUpdateSrategy;

         router.navigateByUrl('/throwing').catch(() => null);
         advance(fixture);
         expect(location.path()).toEqual('/second');
         expect(location.getState()).toEqual(jasmine.objectContaining({ɵrouterPageId: 2}));

         location.back();
         advance(fixture);
         expect(location.path()).toEqual('/first');
         expect(location.getState()).toEqual(jasmine.objectContaining({ɵrouterPageId: 1}));
       }));
  }

  it('restores history correctly when component throws error in constructor and replaceUrl=true',
     fakeAsync(() => {
       const location = TestBed.inject(Location);
       const router = TestBed.inject(Router);

       router.navigateByUrl('/throwing', {replaceUrl: true}).catch(() => null);
       advance(fixture);
       expect(location.path()).toEqual('/second');
       expect(location.getState()).toEqual(jasmine.objectContaining({ɵrouterPageId: 2}));

       location.back();
       advance(fixture);
       expect(location.path()).toEqual('/first');
       expect(location.getState()).toEqual(jasmine.objectContaining({ɵrouterPageId: 1}));
     }));

  it('restores history correctly when component throws error in constructor and skipLocationChange=true',
     fakeAsync(() => {
       const location = TestBed.inject(Location);
       const router = TestBed.inject(Router);

       router.navigateByUrl('/throwing', {skipLocationChange: true}).catch(() => null);
       advance(fixture);
       expect(location.path()).toEqual('/second');
       expect(location.getState()).toEqual(jasmine.objectContaining({ɵrouterPageId: 2}));

       location.back();
       advance(fixture);
       expect(location.path()).toEqual('/first');
       expect(location.getState()).toEqual(jasmine.objectContaining({ɵrouterPageId: 1}));
     }));
});

function createRoot(router: Router, type: any): ComponentFixture<any> {
  const f = TestBed.createComponent(type);
  advance(f);
  router.initialNavigation();
  advance(f);
  return f;
}

@Component({selector: 'simple-cmp', template: `simple`})
class SimpleCmp {
}

@NgModule(
    {imports: [RouterModule.forChild([{path: '', component: SimpleCmp}])]},
    )
class ModuleWithSimpleCmpAsRoute {
}

@Component({selector: 'root-cmp', template: `<router-outlet></router-outlet>`})
class RootCmp {
}

@Component({selector: 'throwing-cmp', template: ''})
class ThrowingCmp {
  constructor() {
    throw new Error('Throwing Cmp');
  }
}



function advance(fixture: ComponentFixture<any>, millis?: number): void {
  tick(millis);
  fixture.detectChanges();
}

@NgModule({
  imports: [
    RouterTestingModule.withRoutes([], {canceledNavigationResolution: 'computed'}), CommonModule
  ],
  exports: [SimpleCmp, RootCmp, ThrowingCmp],
  declarations: [SimpleCmp, RootCmp, ThrowingCmp]
})
class TestModule {
}
