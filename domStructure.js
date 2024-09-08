export const DOM_TREE = {
    appContainer: {
        selector: "div#app-container",
        children: {
            sortByMenu: {
                selector: 'div#action-menu',
                children: {
                    newest: {selector: 'div[data-index="1"]'}
                }
            }
        }
    },
    locationContainer: {
        selector: 'div[class="k7jAl miFGmb lJ3Kh "]',
        children: {
            mainSection: {
                selector: 'div[class="m6QErb DxyBCb kA9KIf dS8AEf XiKgde "]', 
                children: {
                    location: {
                        name: {selector: 'h1[class="DUwDvf lfPIob"]'},
                        category: {selector: 'button[class="DkEaL "]'},
                        rating: {selector: 'div[class="F7nice "] > span > span'} 
                    },
                    tab: {
                        list: {selector: 'div.RWPxGd[role="tablist"]'},
                        activeClass: {selector: "G7m0Af"},
                        buttonReviewTab: {selector: 'button[data-tab-index="1"]'}
                    },
                    generalTab: {
                        selector: 'div[class="m6QErb XiKgde "]',
                        children: {
                            address: {selector: 'button[data-item-id="address"] div[class="Io6YTe fontBodyMedium kR99db fdkmkc "]'},
                            openinghours: { 
                                selector: 'tr[class="y0skZc"]',
                                children: {
                                    day: {selector: 'td.ylH6lf'},
                                    hours: {selector: 'td[class="mxowUb"] > ul > li[class="G8aQO"]'}
                                }
                            },
                            website: {selector: 'div[class="RcCsl fVHpi w4vB1d NOE9ve M0S7ae AG25L "] .rogA2c.ITvuef'},
                            phone: {selector: '[data-item-id^="phone:tel:"] .rogA2c .Io6YTe'},
                            thumbnail: {selector: 'div[class="RZ66Rb FgCUCc"] > button > img'}
                        }
                    },
                    reviewTab: {
                        selector: 'div[class="m6QErb XiKgde "]',
                        children: {
                            totalReview: {selector: 'div[class="PPCwl"] div[class="fontBodySmall"]'},
                            sortBy: {selector: 'div[class="m6QErb Hk4XGb XiKgde tLjsW "] button'},
                            reviewNode: {selector: 'div[class="jftiEf fontBodyMedium "]',
                                children: {
                                    user : {selector: 'div[class="d4r55 "]'},
                                    ratingAndCommentTime: {
                                        selector: 'div[class="DU9Pgb"]',
                                        children: {
                                            rating: {selector: 'span[class*="kvMYJc"] span[class*="elGi1d"]'},
                                            commentTime: {selector: 'span[class="rsqaWe"]'}
                                        }
                                    },
                                    review: {
                                        selector: 'div[class="MyEned"]',
                                        children: {
                                            buttonLoadMore: {selector: 'button[class="w8nwRe kyuRq"]'}
                                        }
                                    },
                                    image: {selector: 'div[class="KtCyie"]'}
                                }
                            }
                        }
                    }
                }
            },
            albumSection: {
                selector: 'div[class="m6QErb DxyBCb kA9KIf dS8AEf XiKgde "]',
                children: {
                    topBarAlbum: {selector: 'div[class="RmaIBf vLnCgb "]',
                        children: {
                            escapeAlbum: {selector: 'button[class="iPpe6d"]'}
                        }
                    },
                    image: {selector: 'div[class="m6QErb XiKgde "]',
                        children: {
                            url: {selector: 'div[class="U39Pmb"]'}
                        }
                    }
                }
            }
        }
    }
};