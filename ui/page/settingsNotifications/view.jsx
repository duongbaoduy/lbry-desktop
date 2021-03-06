// @flow
import * as ICONS from 'constants/icons';
import * as PAGES from 'constants/pages';
import * as SETTINGS from 'constants/settings';
import * as React from 'react';

import Page from 'component/page';
import { FormField } from 'component/common/form';
import Card from 'component/common/card';
import { Lbryio } from 'lbryinc';
import { useHistory } from 'react-router';
import { Redirect } from 'react-router-dom';
import Yrbl from 'component/yrbl';
import Button from 'component/button';

type Props = {
  osNotificationsEnabled: boolean,
  isAuthenticated: boolean,
  setClientSetting: (string, boolean) => void,
};

export default function NotificationSettingsPage(props: Props) {
  const { osNotificationsEnabled, setClientSetting, isAuthenticated } = props;
  const [error, setError] = React.useState();
  const [tagMap, setTagMap] = React.useState({});
  const [tags, setTags] = React.useState();
  const [enabledEmails, setEnabledEmails] = React.useState();
  const { location } = useHistory();
  const urlParams = new URLSearchParams(location.search);
  const verificationToken = urlParams.get('verification_token');
  const lbryIoParams = verificationToken ? { auth_token: verificationToken } : undefined;

  React.useEffect(() => {
    Lbryio.call('tag', 'list', lbryIoParams)
      .then(setTags)
      .catch(e => {
        setError(true);
      });

    Lbryio.call('user_email', 'status', lbryIoParams)
      .then(res => {
        const enabledEmails =
          res.emails &&
          Object.keys(res.emails).reduce((acc, email) => {
            const isEnabled = res.emails[email];
            return [...acc, { email, isEnabled }];
          }, []);

        setTagMap(res.tags);
        setEnabledEmails(enabledEmails);
      })
      .catch(e => {
        setError(true);
      });
  }, []);

  function handleChangeTag(name, newIsEnabled) {
    const tagParams = newIsEnabled ? { add: name } : { remove: name };

    Lbryio.call('user_tag', 'edit', { ...lbryIoParams, ...tagParams }).then(() => {
      const newTagMap = { ...tagMap };
      newTagMap[name] = newIsEnabled;

      setTagMap(newTagMap);
    });
  }

  function handleChangeEmail(email, newIsEnabled) {
    Lbryio.call('user_email', 'edit', {
      email: email,
      enabled: newIsEnabled,
      ...lbryIoParams,
    })
      .then(() => {
        const newEnabledEmails = enabledEmails
          ? enabledEmails.map(userEmail => {
              if (email === userEmail.email) {
                return { email, isEnabled: newIsEnabled };
              }

              return userEmail;
            })
          : [];

        setEnabledEmails(newEnabledEmails);
      })
      .catch(e => {
        setError(true);
      });
  }

  if (!isAuthenticated && !verificationToken) {
    return <Redirect to={`/$/${PAGES.AUTH_SIGNIN}?redirect=${location.pathname}`} />;
  }

  return (
    <Page>
      {error ? (
        <Yrbl
          type="sad"
          title={__('Uh Oh')}
          subtitle={
            <>
              <div>{__('There was an error displaying this page.')}</div>
              <div className="section__actions">
                <Button
                  button="secondary"
                  label={__('Refresh')}
                  icon={ICONS.REFRESH}
                  onClick={() => window.location.reload()}
                />
                <Button button="secondary" label={__('Go Home')} icon={ICONS.HOME} navigate={'/'} />
              </div>
            </>
          }
        />
      ) : (
        <div className="card-stack">
          {/* @if TARGET='app' */}
          <Card
            title={__('App Notifications')}
            subtitle={__('Notification settings for the desktop app.')}
            actions={
              <FormField
                type="checkbox"
                name="desktopNotification"
                onChange={() => setClientSetting(SETTINGS.OS_NOTIFICATIONS_ENABLED, !osNotificationsEnabled)}
                checked={osNotificationsEnabled}
                label={__('Show Desktop Notifications')}
                helper={__('Get notified when a publish or channel is confirmed.')}
              />
            }
          />

          {/* @endif */}

          {enabledEmails && enabledEmails.length > 0 && (
            <Card
              title={enabledEmails.length === 1 ? __('Your Email') : __('Receiving Addresses')}
              subtitle={__('Uncheck your email below if you want to stop receiving messages.')}
              actions={
                <>
                  {enabledEmails.map(({ email, isEnabled }) => (
                    <FormField
                      type="checkbox"
                      name={`active-email:${email}`}
                      key={email}
                      onChange={() => handleChangeEmail(email, !isEnabled)}
                      checked={isEnabled}
                      label={email}
                    />
                  ))}
                </>
              }
            />
          )}

          {tags && tags.length > 0 && (
            <Card
              title={__('Email Preferences')}
              subtitle={__("Opt out of any topics you don't want to receive email about.")}
              actions={
                <>
                  {tags.map(tag => {
                    const isEnabled = tagMap[tag.name];
                    return (
                      <FormField
                        type="checkbox"
                        key={tag.name}
                        name={tag.name}
                        onChange={() => handleChangeTag(tag.name, !isEnabled)}
                        checked={isEnabled}
                        label={tag.description}
                      />
                    );
                  })}
                </>
              }
            />
          )}
        </div>
      )}
    </Page>
  );
}
