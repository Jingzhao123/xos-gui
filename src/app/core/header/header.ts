/*
 * Copyright 2017-present Open Networking Foundation

 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at

 * http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import './header.scss';
import {IWSEvent} from '../../datasources/websocket/global';
import {IStoreService} from '../../datasources/stores/synchronizer.store';
import {IXosAuthService} from '../../datasources/rest/auth.rest';
import {IXosNavigationService, IXosNavigationRoute} from '../services/navigation';
import {IStateService} from 'angular-ui-router';
import * as $ from 'jquery';
import {IXosStyleConfig} from '../../../index';
import {IXosSearchService, IXosSearchResult} from '../../datasources/helpers/search.service';
import {IXosKeyboardShortcutService} from '../services/keyboard-shortcut';
import {Subscription} from 'rxjs';
import {IXosConfigHelpersService} from '../services/helpers/config.helpers';
import {IXosDebugService} from '../debug/debug.service';
import {IXosVersionReaderService} from '../services/version-reader';

export interface INotification extends IWSEvent {
  viewed?: boolean;
}

class HeaderController {
  static $inject = [
    '$log',
    '$scope',
    '$rootScope',
    '$state',
    'AuthService',
    'SynchronizerStore',
    'toastr',
    'toastrConfig',
    'XosNavigationService',
    'StyleConfig',
    'SearchService',
    'XosKeyboardShortcut',
    'ConfigHelpers',
    'XosDebug',
    'XosVersionReaderService'
  ];
  public notifications: INotification[] = [];
  public newNotifications: INotification[] = [];
  public version: string;
  public userEmail: string;
  public routeSelected: (route: IXosSearchResult) => void;
  public states: IXosNavigationRoute[];
  public query: string;
  public search: (query: string) => any[];

  private syncStoreSubscription: Subscription;

  constructor(
    private $log: ng.ILogService,
    private $scope: angular.IScope,
    private $rootScope: ng.IScope,
    private $state: IStateService,
    private authService: IXosAuthService,
    private syncStore: IStoreService,
    private toastr: ng.toastr.IToastrService,
    private toastrConfig: ng.toastr.IToastrConfig,
    private NavigationService: IXosNavigationService,
    private StyleConfig: IXosStyleConfig,
    private SearchService: IXosSearchService,
    private XosKeyboardShortcut: IXosKeyboardShortcutService,
    private ConfigHelpers: IXosConfigHelpersService,
    private XosDebugService: IXosDebugService,
    private XosVersionReaderService: IXosVersionReaderService
  ) {

  }

  $onInit() {
    this.$log.info('[XosHeader] Setup');

    this.XosVersionReaderService.getVersion()
    .then((version: string) => {
      this.version = version;
    });

    angular.extend(this.toastrConfig, {
      newestOnTop: false,
      positionClass: 'toast-top-right',
      preventDuplicates: false,
      preventOpenDuplicates: false,
      progressBar: true,
      onTap: (toast) => {
        this.$state.go(toast.scope.extraData.dest.name, toast.scope.extraData.dest.params);
      }
    });

    this.search = (query: string) => {
      return this.SearchService.search(query);
    };

    // listen for keypress
    this.XosKeyboardShortcut.registerKeyBinding({
      key: 'F',
      description: 'Select search box',
      cb: () => {
        $('.navbar-form input').focus();
      },
    }, 'global');

    // redirect to selected page
    this.routeSelected = (item: IXosSearchResult) => {
      if (angular.isString(item.state)) {
        this.$state.go(item.state);
      }
      else {
        this.$state.go(item.state.name, item.state.params);
      }
      this.query = null;
    };

    this.userEmail = this.authService.getUser() ? this.authService.getUser().email : '';

    this.syncStoreSubscription = this.syncStore.query()
      .subscribe(
        (event: IWSEvent) => {
          this.$scope.$evalAsync(() => {

            if (!this.XosDebugService.status.notifications) {
              // NOTE: notifications can be disabled
              return;
            }


            if (event.model === 'Diag') {
              // NOTE skip notifications for Diag model
              // this should not arrive, but a check won't harm
              return;
            }

            const isRemoval: boolean = event.deleted || false;

            let toastrMsg: string;
            let toastrLevel: string;
            if (!isRemoval) {
              if (event.msg.object.backend_code === 0) {
                toastrMsg = 'Synchronization in progress for:';
                toastrLevel = 'info';
              }
              else if (event.msg.object.backend_code === 1) {
                toastrMsg = 'Synchronization succedeed for:';
                toastrLevel = 'success';
              }
              else if (event.msg.object.backend_code === 2) {
                toastrMsg = 'Synchronization failed for:';
                toastrLevel = 'error';
              }
            }
            else {
              toastrMsg = 'Deleted object:';
              toastrLevel = 'info';
            }

            if (toastrLevel && toastrMsg) {
              let modelName = event.msg.object.name;
              let modelClassName = event.model;
              if (angular.isUndefined(event.msg.object.name) || event.msg.object.name === null) {
                modelName = `${modelClassName} [${event.msg.object.id}]`;
              }

              const dest = this.ConfigHelpers.stateWithParamsForJs(modelClassName, event.msg.object.id);

              if (!event.skip_notification) {
                this.toastr[toastrLevel](`${toastrMsg} ${modelName}`, modelClassName, {extraData: {dest: dest}});
              }
            }
            // this.notifications.unshift(event);
            // this.newNotifications = this.getNewNotifications(this.notifications);
          });
        }
      );
  }

  $onDestroy() {
    this.$log.info('[XosHeader] Teardown');
    this.syncStoreSubscription.unsubscribe();
  }

  public getLogo(): string {
    return require(`../../images/brand/${this.StyleConfig.logo}`);
  }

  // TODO display a list of notification in the template (if it make sense)
  // public viewNotification = (notification: INotification) => {
  //   notification.viewed = true;
  //   this.newNotifications = this.getNewNotifications(this.notifications);
  // };
  //
  // private getNewNotifications = (notifications: INotification[]) => {
  //   return this.notifications.filter((n: INotification) => {
  //     return !n.viewed;
  //   });
  // };
}

export const xosHeader: angular.IComponentOptions = {
  template: require('./header.html'),
  controllerAs: 'vm',
  controller: HeaderController
};
