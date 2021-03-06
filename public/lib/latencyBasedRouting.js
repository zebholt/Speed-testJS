/*
 * *
 *  Copyright 2014 Comcast Cable Communications Management, LLC
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *  http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 * /
 */

(function () {
    'use strict';

    /**
     * latencyBasedRouting
     * @param location - pass the location to get the list available servers
     * @param callbackComplete - callback function for test suite complete event
     * @param callbackError - callback function for test suite error event
     */
    function latencyBasedRouting(location, callbackComplete, callbackError) {
        this.location = location;
        this.clientCallbackComplete = callbackComplete;
        this.clientCallbackError = callbackError;
        this.latencyHttpTestRequest = [];
        this.numServersResponded = 0;
    }

    /**
     * onError method
     * @param result
     * @return error object
     */
    latencyBasedRouting.prototype.onError = function (result) {
        this.clientCallbackError(result);
    };

    /**
     * Function getNearestServer returns all the available servers in a particular location
     */
    latencyBasedRouting.prototype.getNearestServer = function () {
        var self = this;
        var url = '/testServer?location=' + this.location;
        var request = new XMLHttpRequest();
        request.onreadystatechange = function () {
            if (request.readyState === XMLHttpRequest.DONE) {
                self.performLatencyBasedRouting(JSON.parse(request.responseText));
            }
        };
        request.open('GET', url, true);
        request.send(null);
    };

    /**
     * Wrapper that calls selectServer to run the httpLatencyTest and creates a serverData object
     * tracking different server parameters.
     * @param data object contains server the information
     */
    latencyBasedRouting.prototype.performLatencyBasedRouting = function (data) {
        console.log(data);
        var serverInfo;
        for (var i = 0; i < data.length; i++) {
            serverInfo = data[i];
            var serverData = {
                'IPv4Address': serverInfo.IPv4Address,
                'IPv6Address': serverInfo.IPv6Address,
                'Fqdn': serverInfo.Fqdn,
                'latencyResult': []
            };
            var url = 'http://' + serverInfo.IPv4Address + '/latency';
            this.selectServer(url, serverData);
        }

    };

    /**
     * Function selectServer performs the latency test against all the servers
     * and retunrs the server information with lowest latency to the client
     * @param url to perform latency test
     * @param data which contains server information {IPv4Address, IPv6Address, Fqdn}
     */
    latencyBasedRouting.prototype.selectServer = function (url, data) {
        var self = this;
        //latencyHttpOnComplete
        var latencyHttpOnComplete = function (result) {
            self.numServersResponded++;
            if (self.numServersResponded === 1) {
                data.latencyResult.push(result[0].time);
                self.clientCallbackComplete(data);
                // once we get the response from at least one server we abort all
                // other latency request for rest of the servers
                for (var i = 0; i < self.latencyHttpTestRequest.length; i++) {
                    self.latencyHttpTestRequest[i].abortAll();
                }
            }

        };
        // creating latencyHttpTestSuite object for each server
        var latencyHttpTestSuite = new window.latencyHttpTest(url, 1, 10000, latencyHttpOnComplete, latencyHttpOnProgress,
            latencyHttpOnAbort, latencyHttpOnTimeout, latencyHttpOnError);
        latencyHttpTestSuite.start();
        // pushing latencyHttpTestSuite for each server into an array
        self.latencyHttpTestRequest.push(latencyHttpTestSuite);
    };

    function latencyHttpOnProgress(result) {
        console.log(result);
    }

    function latencyHttpOnAbort(result) {
        console.dir(result);
    }

    function latencyHttpOnTimeout(result) {
        console.dir(result);
    }

    function latencyHttpOnError(result) {
        console.dir(result);
    }

    window.latencyBasedRouting = latencyBasedRouting;

})();
